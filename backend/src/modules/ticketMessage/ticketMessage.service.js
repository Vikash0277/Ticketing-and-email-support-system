import mongoose from "mongoose";

import Ticket from "../tickets/ticket.model.js";
import TicketMessage from "./ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function getRole(user) {
  return user?.role;
}

function isStaff(user) {
  return ["agent", "admin"].includes(getRole(user));
}

function assertAuthenticated(user) {
  if (!getUserId(user)) {
    throw createError("Authentication required", 401);
  }
}

async function getAccessibleTicket(ticketId, user) {
  assertAuthenticated(user);

  if (!mongoose.isValidObjectId(ticketId)) {
    throw createError("Invalid ticket ID", 400);
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw createError("Ticket not found", 404);
  }

  if (
    !isStaff(user) &&
    String(ticket.requesterId) !== String(getUserId(user))
  ) {
    throw createError("You are not allowed to access this ticket", 403);
  }

  return ticket;
}

function getSenderRole(user) {
  const role = getRole(user);

  if (role === "admin") return "admin";
  if (role === "agent") return "agent";

  // Adapt this if your User model uses different role names.
  if (role === "customer" || role === "user") {
    return "customer";
  }

  throw createError("Unsupported user role", 403);
}

// POST /api/v1/tickets/:ticketId/messages
export async function createTicketMessage(ticketId, data, user) {
  const ticket = await getAccessibleTicket(ticketId, user);
  const senderRole = getSenderRole(user);

  if (data.type === "internal" && !isStaff(user)) {
    throw createError("Only support staff can add internal notes", 403);
  }

  if (["closed", "resolved"].includes(ticket.status)) {
    throw createError(
      "This ticket is closed or resolved and cannot receive messages",
      409
    );
  }

  const message = await TicketMessage.create({
    ticketId: ticket._id,
    senderId: getUserId(user),
    senderName: user.name,
    senderEmail: user.email,
    senderRole,
    type: data.type ?? "public",
    body: data.body,
    source: "web",
  });

  const updates = {
    lastMessageAt: new Date(),
  };

  // Record the first support response, not the customer's first message.
  if (
    isStaff(user) &&
    message.type === "public" &&
    !ticket.firstResponseAt
  ) {
    updates.firstResponseAt = new Date();
  }

  await Ticket.updateOne(
    { _id: ticket._id },
    { $set: updates },
    { runValidators: true }
  );

  await TicketActivity.create({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action:
      message.type === "internal"
        ? "internal_note_added"
        : "replied",
    metadata: {
      messageId: message._id,
      messageType: message.type,
    },
  });

  return message;
}

// GET /api/v1/tickets/:ticketId/messages
export async function listTicketMessages(ticketId, query, user) {
  const ticket = await getAccessibleTicket(ticketId, user);

  const { page, limit, sortOrder } = query;

  const filter = {
    ticketId: ticket._id,
  };

  // Customers must never see internal notes.
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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

// GET /api/v1/tickets/:ticketId/messages/:messageId
export async function getTicketMessage(
  ticketId,
  messageId,
  user
) {
  const ticket = await getAccessibleTicket(ticketId, user);

  if (!mongoose.isValidObjectId(messageId)) {
    throw createError("Invalid message ID", 400);
  }

  const filter = {
    _id: messageId,
    ticketId: ticket._id,
  };

  if (!isStaff(user)) {
    filter.type = "public";
  }

  const message = await TicketMessage.findOne(filter);

  if (!message) {
    throw createError("Message not found", 404);
  }

  return message;
}