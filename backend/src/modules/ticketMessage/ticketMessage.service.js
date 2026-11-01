import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import { buildPagination } from "../../utils/pagination.js";
import Ticket from "../tickets/ticket.model.js";
import TicketMessage from "./ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";
import {
  sendAgentReply,
  sendCustomerMessage,
} from "../email/email.outbound.email.js";
import { createNotification } from "../notification/notification.service.js";
import User from "../user/user.model.js";

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function isStaff(user) {
  return ["agent", "admin"].includes(user?.role);
}

function assertAuthenticated(user) {
  if (!getUserId(user)) throw ApiError.unauthorized();
}

async function getAccessibleTicket(ticketId, user) {
  assertAuthenticated(user);

  if (!mongoose.isValidObjectId(ticketId)) {
    throw ApiError.badRequest("Invalid ticket ID");
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) throw ApiError.notFound("Ticket not found");

  if (
    !isStaff(user) &&
    String(ticket.requesterId) !== String(getUserId(user))
  ) {
    throw ApiError.forbidden("You are not allowed to access this ticket");
  }

  return ticket;
}

function getSenderRole(user) {
  const role = user?.role;

  if (role === "admin") return "admin";
  if (role === "agent") return "agent";
  if (role === "customer" || role === "user") return "customer";

  throw ApiError.forbidden("Unsupported user role");
}

export async function createTicketMessage(
  ticketId,
  data,
  user,
  attachments = []
) {
  const ticket = await getAccessibleTicket(ticketId, user);
  const senderRole = getSenderRole(user);
  const messageType = data.type ?? "public";

  if (messageType === "internal" && !isStaff(user)) {
    throw ApiError.forbidden("Only support staff can add internal notes");
  }

  if (["resolved", "closed"].includes(ticket.status)) {
    if (isStaff(user)) {
      throw ApiError.conflict(
        "A resolved or closed ticket cannot receive new messages. Reopen it first."
      );
    }

    // A customer replying on the web behaves like an email reply: reopen.
    if (messageType !== "public") {
      throw ApiError.conflict("This ticket is not open for new messages");
    }

    const oldStatus = ticket.status;
    ticket.status = "reopened";
    ticket.resolvedAt = null;
    ticket.closedAt = null;
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: getUserId(user),
      action: "reopened",
      oldValue: oldStatus,
      newValue: "reopened",
      metadata: { source: "web" },
    });
  }

  const message = await TicketMessage.create({
    ticketId: ticket._id,
    senderId: getUserId(user),
    senderName: user.name,
    senderEmail: user.email,
    senderRole,
    type: messageType,
    body: data.body,
    attachments,
    source: "web",
  });

  const updates = {
    lastMessageAt: message.createdAt,
    lastReplyBy: senderRole === "customer" ? "customer" : senderRole,
  };

  if (
    isStaff(user) &&
    message.type === "public" &&
    !ticket.firstResponseAt
  ) {
    updates.firstResponseAt = message.createdAt;
  }

  if (
    isStaff(user) &&
    message.type === "public" &&
    ["open", "reopened"].includes(ticket.status)
  ) {
    updates.status = "in_progress";
  }

  await Ticket.updateOne(
    { _id: ticket._id },
    { $set: updates },
    { runValidators: true }
  );

  await TicketActivity.create({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action: messageType === "internal" ? "internal_note_added" : "replied",
    metadata: {
      messageId: message._id,
      messageType,
      source: "web",
    },
  });

  if (messageType === "public") {
    const freshTicket = await Ticket.findById(ticket._id);

    if (isStaff(user)) {
      await sendAgentReply(freshTicket, message.body);

      await createNotification({
        userId: freshTicket.requesterId,
        ticketId: freshTicket._id,
        type: "ticket_reply",
        title: `New reply on ${freshTicket.ticketNumber}`,
        message: `${user.name} replied to "${freshTicket.subject}".`,
        metadata: { ticketNumber: freshTicket.ticketNumber },
      });
    } else {
      await sendCustomerMessage(freshTicket, message.body);

      if (freshTicket.assignedTo) {
        await createNotification({
          userId: freshTicket.assignedTo,
          ticketId: freshTicket._id,
          type: "ticket_reply",
          title: `Customer replied on ${freshTicket.ticketNumber}`,
          message: `${user.name} added a message to "${freshTicket.subject}".`,
          metadata: { ticketNumber: freshTicket.ticketNumber },
        });
      } else {
        const staff = await User.find({
          role: { $in: ["agent", "admin"] },
          isActive: true,
        })
          .select("_id")
          .lean();

        await Promise.all(
          staff.map((member) =>
            createNotification({
              userId: member._id,
              ticketId: freshTicket._id,
              type: "ticket_reply",
              title: `Customer replied on ${freshTicket.ticketNumber}`,
              message: `${user.name} added a message to "${freshTicket.subject}".`,
              metadata: { ticketNumber: freshTicket.ticketNumber },
            })
          )
        );
      }
    }
  }

  return message;
}

export async function listTicketMessages(ticketId, query, user) {
  const ticket = await getAccessibleTicket(ticketId, user);

  const { page, limit, sortOrder } = query;

  const filter = { ticketId: ticket._id };

  if (!isStaff(user)) {
    filter.type = "public";
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const [messages, total] = await Promise.all([
    TicketMessage.find(filter)
      .sort({ createdAt: sortDirection, _id: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),

    TicketMessage.countDocuments(filter),
  ]);

  return {
    messages,
    pagination: buildPagination(page, limit, total),
  };
}

export async function getTicketMessage(ticketId, messageId, user) {
  const ticket = await getAccessibleTicket(ticketId, user);

  if (!mongoose.isValidObjectId(messageId)) {
    throw ApiError.badRequest("Invalid message ID");
  }

  const filter = { _id: messageId, ticketId: ticket._id };

  if (!isStaff(user)) filter.type = "public";

  const message = await TicketMessage.findOne(filter);

  if (!message) throw ApiError.notFound("Message not found");

  return message;
}

export async function getMessageAttachment(
  ticketId,
  messageId,
  attachmentId,
  user
) {
  const message = await getTicketMessage(ticketId, messageId, user);

  const attachment = message.attachments.id(attachmentId);

  if (!attachment) throw ApiError.notFound("Attachment not found");

  return { message, attachment };
}
