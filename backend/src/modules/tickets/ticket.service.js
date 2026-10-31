import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import { buildPagination } from "../../utils/pagination.js";
import { escapeRegex } from "../../utils/sanitize.js";
import Ticket from "./ticket.model.js";
import TicketMessage from "../ticketMessage/ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";
import Category from "../categories/category.model.js";
import User from "../user/user.model.js";
import {
  queueAssignmentNotification,
  queueTicketConfirmation,
  queueStatusNotification,
} from "../email/email.outbound.email.js";
import { createNotification } from "../notification/notification.service.js";

const SLA_HOURS = { urgent: 4, high: 8, medium: 24, low: 72 };

const STATUS_TRANSITIONS = {
  open: ["in_progress", "pending", "resolved", "closed"],
  in_progress: ["pending", "resolved", "closed"],
  pending: ["in_progress", "resolved", "closed"],
  reopened: ["in_progress", "pending", "resolved", "closed"],
  resolved: ["reopened", "closed"],
  closed: ["reopened"],
};

const POPULATE = [
  { path: "categoryId", select: "name description" },
  { path: "assignedTo", select: "name email avatarUrl jobTitle" },
  { path: "requesterId", select: "name email avatarUrl" },
];

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function isStaff(user) {
  return ["agent", "admin"].includes(user?.role);
}

function assertAuthenticated(user) {
  if (!getUserId(user)) throw ApiError.unauthorized();
}

export function canAccessTicket(ticket, user) {
  assertAuthenticated(user);

  if (isStaff(user)) return true;

  return String(ticket.requesterId?._id ?? ticket.requesterId) ===
    String(getUserId(user));
}

async function getTicketOrThrow(ticketId) {
  if (!mongoose.isValidObjectId(ticketId)) {
    throw ApiError.badRequest("Invalid ticket ID");
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) throw ApiError.notFound("Ticket not found");

  return ticket;
}

async function getActiveCategoryOrThrow(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw ApiError.badRequest("Invalid category ID");
  }

  const category = await Category.findOne({ _id: categoryId, isActive: true });

  if (!category) {
    throw ApiError.badRequest("Category not found or inactive");
  }

  return category;
}

async function recordActivity({
  ticketId,
  actorId,
  action,
  oldValue,
  newValue,
  metadata = {},
}) {
  await TicketActivity.create({
    ticketId,
    actorId: actorId ?? null,
    action,
    oldValue,
    newValue,
    metadata,
  });
}

function dueDateFor(priority) {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.medium;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function notifyStaff({ ticket, type, title, message }) {
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
        ticketId: ticket._id,
        type,
        title,
        message,
        metadata: { ticketNumber: ticket.ticketNumber },
      })
    )
  );
}

export async function createTicket(data, user, attachments = []) {
  assertAuthenticated(user);

  const category = await getActiveCategoryOrThrow(data.categoryId);

  const ticket = await Ticket.create({
    subject: data.subject,
    description: data.description,
    categoryId: category._id,
    priority: data.priority ?? "medium",
    tags: data.tags ?? [],
    requesterId: getUserId(user),
    requesterName: user.name,
    requesterEmail: user.email,
    source: data.source || "web",
    status: "open",
    dueAt: dueDateFor(data.priority ?? "medium"),
  });

  await TicketMessage.create({
    ticketId: ticket._id,
    senderId: getUserId(user),
    senderName: user.name,
    senderEmail: user.email,
    senderRole: user.role === "admin" ? "admin" : user.role === "agent" ? "agent" : "customer",
    type: "public",
    body: data.description,
    attachments,
    source: "web",
  });

  ticket.lastMessageAt = new Date();
  ticket.lastReplyBy = "customer";
  await ticket.save();

  await recordActivity({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action: "created",
    newValue: {
      status: ticket.status,
      priority: ticket.priority,
      categoryId: ticket.categoryId,
    },
  });

  await ticket.populate(POPULATE);

  // Email failures must never block ticket creation.
  await queueTicketConfirmation(ticket);

  await createNotification({
    userId: getUserId(user),
    ticketId: ticket._id,
    type: "ticket_created",
    title: `Ticket ${ticket.ticketNumber} created`,
    message: `We received your request "${ticket.subject}".`,
    metadata: { ticketNumber: ticket.ticketNumber },
  });

  await notifyStaff({
    ticket,
    type: "ticket_created",
    title: `New ticket ${ticket.ticketNumber}`,
    message: `${user.name} opened "${ticket.subject}" (${ticket.priority}).`,
  });

  return ticket;
}

export async function listTickets(query, user) {
  assertAuthenticated(user);

  const {
    page = 1,
    limit = 20,
    status,
    priority,
    categoryId,
    assignedTo,
    requesterId,
    search,
    tags,
    dateFrom,
    dateTo,
    view = "all",
    sortBy = "updatedAt",
    sortOrder = "desc",
  } = query;

  const filter = {};

  if (!isStaff(user)) {
    filter.requesterId = getUserId(user);
  } else {
    if (view === "mine") filter.assignedTo = getUserId(user);
    if (view === "unassigned") filter.assignedTo = null;
    if (view === "overdue") {
      filter.dueAt = { $lt: new Date() };
      filter.status = { $nin: ["resolved", "closed"] };
    }
  }

  if (status) {
    const statuses = String(status)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }

  if (priority) {
    const priorities = String(priority)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    filter.priority =
      priorities.length > 1 ? { $in: priorities } : priorities[0];
  }

  if (categoryId) filter.categoryId = categoryId;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (requesterId && isStaff(user)) filter.requesterId = requesterId;
  if (tags) filter.tags = { $in: String(tags).split(",") };

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { subject: regex },
      { description: regex },
      { ticketNumber: regex },
      { requesterEmail: regex },
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    updated: { updatedAt: -1 },
    priority: { priority: -1 },
  };

  const sort =
    sortMap[sortBy] ||
    { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate(POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Ticket.countDocuments(filter),
  ]);

  return {
    tickets,
    pagination: buildPagination(page, limit, total),
  };
}

export async function getTicket(ticketId, user) {
  const ticket = await getTicketOrThrow(ticketId);

  if (!canAccessTicket(ticket, user)) {
    throw ApiError.forbidden("You are not allowed to access this ticket");
  }

  await ticket.populate(POPULATE);

  const [messageCount, attachmentCount] = await Promise.all([
    TicketMessage.countDocuments({ ticketId: ticket._id }),
    TicketMessage.aggregate([
      { $match: { ticketId: ticket._id } },
      { $project: { count: { $size: { $ifNull: ["$attachments", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
  ]);

  const result = ticket.toObject({ virtuals: true });
  result.messageCount = messageCount;
  result.attachmentCount = attachmentCount[0]?.total ?? 0;

  return result;
}

export async function updateTicket(ticketId, data, user) {
  const ticket = await getTicketOrThrow(ticketId);

  if (!canAccessTicket(ticket, user)) {
    throw ApiError.forbidden("You are not allowed to access this ticket");
  }

  if (!isStaff(user)) {
    const forbidden = ["categoryId", "priority", "tags"];

    if (forbidden.some((field) => data[field] !== undefined)) {
      throw ApiError.forbidden(
        "Only support staff can update category, priority or tags"
      );
    }

    if (["resolved", "closed"].includes(ticket.status)) {
      throw ApiError.conflict("A resolved or closed ticket cannot be edited");
    }
  }

  const oldCategoryId = ticket.categoryId ? String(ticket.categoryId) : null;
  const oldPriority = ticket.priority;

  if (data.subject !== undefined) ticket.subject = data.subject;
  if (data.description !== undefined) ticket.description = data.description;

  if (data.categoryId !== undefined) {
    const category = await getActiveCategoryOrThrow(data.categoryId);
    ticket.categoryId = category._id;
  }

  if (data.priority !== undefined && data.priority !== ticket.priority) {
    ticket.priority = data.priority;
    ticket.dueAt = dueDateFor(data.priority);
  }

  if (data.tags !== undefined) ticket.tags = data.tags;

  await ticket.save();

  if (
    data.categoryId !== undefined &&
    oldCategoryId !== String(ticket.categoryId)
  ) {
    await recordActivity({
      ticketId: ticket._id,
      actorId: getUserId(user),
      action: "category_changed",
      oldValue: oldCategoryId,
      newValue: String(ticket.categoryId),
    });
  }

  if (oldPriority !== ticket.priority) {
    await recordActivity({
      ticketId: ticket._id,
      actorId: getUserId(user),
      action: "priority_changed",
      oldValue: oldPriority,
      newValue: ticket.priority,
    });
  }

  await ticket.populate(POPULATE);

  return ticket;
}

export async function updateTicketStatus(ticketId, data, user) {
  assertAuthenticated(user);

  const ticket = await getTicketOrThrow(ticketId);

  if (!canAccessTicket(ticket, user)) {
    throw ApiError.forbidden("You are not allowed to access this ticket");
  }

  const nextStatus = data.status;
  const oldStatus = ticket.status;

  if (nextStatus === oldStatus) {
    await ticket.populate(POPULATE);
    return ticket;
  }

  if (!isStaff(user) && nextStatus !== "reopened") {
    throw ApiError.forbidden("Only support staff can change ticket status");
  }

  const allowed = STATUS_TRANSITIONS[oldStatus] ?? [];

  if (!allowed.includes(nextStatus)) {
    throw ApiError.badRequest(
      `Cannot change status from "${oldStatus}" to "${nextStatus}"`
    );
  }

  ticket.status = nextStatus;

  if (nextStatus === "resolved") {
    ticket.resolvedAt = new Date();
    ticket.closedAt = null;
  } else if (nextStatus === "closed") {
    ticket.closedAt = new Date();
    ticket.resolvedAt = ticket.resolvedAt || new Date();
  } else if (nextStatus === "reopened") {
    ticket.resolvedAt = null;
    ticket.closedAt = null;
  } else {
    ticket.resolvedAt = null;
    ticket.closedAt = null;
  }

  await ticket.save();

  const action =
    nextStatus === "resolved"
      ? "resolved"
      : nextStatus === "closed"
        ? "closed"
        : nextStatus === "reopened"
          ? "reopened"
          : "status_changed";

  await recordActivity({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action,
    oldValue: oldStatus,
    newValue: nextStatus,
    metadata: data.note ? { note: data.note } : {},
  });

  await ticket.populate(POPULATE);

  await queueStatusNotification(ticket);

  await createNotification({
    userId: ticket.requesterId,
    ticketId: ticket._id,
    type: nextStatus === "reopened" ? "ticket_reopened" : "ticket_status_changed",
    title: `Ticket ${ticket.ticketNumber} is now ${nextStatus.replace("_", " ")}`,
    message: `Your ticket "${ticket.subject}" status changed to ${nextStatus.replace("_", " ")}.`,
    metadata: { ticketNumber: ticket.ticketNumber, status: nextStatus },
  });

  return ticket;
}

export function resolveTicket(ticketId, data, user) {
  return updateTicketStatus(ticketId, { ...data, status: "resolved" }, user);
}

export function closeTicket(ticketId, data, user) {
  return updateTicketStatus(ticketId, { ...data, status: "closed" }, user);
}

export function reopenTicket(ticketId, data, user) {
  return updateTicketStatus(ticketId, { ...data, status: "reopened" }, user);
}

export async function assignTicket(ticketId, data, user) {
  assertAuthenticated(user);

  if (!isStaff(user)) {
    throw ApiError.forbidden("Only support staff can assign tickets");
  }

  const ticket = await getTicketOrThrow(ticketId);
  const previousAssignee = ticket.assignedTo
    ? String(ticket.assignedTo)
    : null;
  const nextAssignee = data.assignedTo ? String(data.assignedTo) : null;

  if (previousAssignee === nextAssignee) {
    await ticket.populate(POPULATE);
    return ticket;
  }

  let agent = null;

  if (data.assignedTo) {
    agent = await User.findOne({
      _id: data.assignedTo,
      role: { $in: ["agent", "admin"] },
      isActive: true,
    });

    if (!agent) {
      throw ApiError.badRequest(
        "Assignee must be an active agent or admin"
      );
    }
  }

  ticket.assignedTo = data.assignedTo || null;
  ticket.assignedAt = data.assignedTo ? new Date() : null;

  const oldStatus = ticket.status;

  if (
    data.assignedTo &&
    ["open", "reopened"].includes(ticket.status)
  ) {
    ticket.status = "in_progress";
  }

  await ticket.save();

  await recordActivity({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action: previousAssignee ? "reassigned" : "assigned",
    oldValue: previousAssignee,
    newValue: nextAssignee,
    metadata: agent ? { assigneeName: agent.name } : {},
  });

  if (oldStatus !== ticket.status) {
    await recordActivity({
      ticketId: ticket._id,
      actorId: getUserId(user),
      action: "status_changed",
      oldValue: oldStatus,
      newValue: ticket.status,
      metadata: { reason: "assigned" },
    });
  }

  await ticket.populate(POPULATE);

  if (agent) {
    await queueAssignmentNotification(ticket, agent, Boolean(previousAssignee));

    await createNotification({
      userId: agent._id,
      ticketId: ticket._id,
      type: "ticket_assigned",
      title: `Ticket ${ticket.ticketNumber} assigned to you`,
      message: `"${ticket.subject}" is now in your queue (${ticket.priority} priority).`,
      metadata: { ticketNumber: ticket.ticketNumber },
    });
  }

  return ticket;
}

export async function getTicketStats(user) {
  assertAuthenticated(user);

  const scope = isStaff(user) ? {} : { requesterId: new mongoose.Types.ObjectId(getUserId(user)) };

  const [summary] = await Ticket.aggregate([
    { $match: scope },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        resolved: {
          $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
        },
        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        reopened: {
          $sum: { $cond: [{ $eq: ["$status", "reopened"] }, 1, 0] },
        },
        unassigned: {
          $sum: { $cond: [{ $eq: ["$assignedTo", null] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueAt", new Date()] },
                  { $not: [{ $in: ["$status", ["resolved", "closed"]] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    summary ?? {
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      reopened: 0,
      unassigned: 0,
      overdue: 0,
    }
  );
}
