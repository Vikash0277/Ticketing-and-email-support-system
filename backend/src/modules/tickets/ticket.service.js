// src/modules/tickets/ticket.service.js

import mongoose from "mongoose";
import Ticket from "./ticket.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";
import Category from "../categories/category.model.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function getUserRole(user) {
  return user?.role;
}

function isStaff(user) {
  return ["agent", "admin"].includes(getUserRole(user));
}

function assertAuthenticated(user) {
  if (!getUserId(user)) {
    throw createError("Authentication required", 401);
  }
}

async function getTicketOrThrow(ticketId) {
  if (!mongoose.isValidObjectId(ticketId)) {
    throw createError("Invalid ticket ID", 400);
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw createError("Ticket not found", 404);
  }

  return ticket;
}

async function getActiveCategoryOrThrow(categoryId) {
  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
  });

  if (!category) {
    throw createError("Category not found or inactive", 400);
  }

  return category;
}

function assertCanAccessTicket(ticket, user) {
  assertAuthenticated(user);

  if (isStaff(user)) {
    return;
  }

  if (
    String(ticket.requesterId) !== String(getUserId(user))
  ) {
    throw createError("You are not allowed to access this ticket", 403);
  }
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

// POST /api/v1/tickets
export async function createTicket(data, user) {
  assertAuthenticated(user);

  const category = await getActiveCategoryOrThrow(data.categoryId);

  const ticket = await Ticket.create({
    subject: data.subject,
    description: data.description,
    categoryId: category._id,
    priority: data.priority,
    tags: data.tags,

    requesterId: getUserId(user),
    requesterName: user.name,
    requesterEmail: user.email,

    source: "web",
    status: "open",
  });

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

  await ticket.populate("categoryId", "name description");

  return ticket;
}

// GET /api/v1/tickets
export async function listTickets(query, user) {
  assertAuthenticated(user);

  const {
    page,
    limit,
    status,
    priority,
    categoryId,
    sortBy,
    sortOrder,
  } = query;

  const filter = {};

  // Customers can only see their own tickets.
  if (!isStaff(user)) {
    filter.requesterId = getUserId(user);
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (categoryId) filter.categoryId = categoryId;

  const skip = (page - 1) * limit;

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate("categoryId", "name description")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Ticket.countDocuments(filter),
  ]);

  return {
    tickets,
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

// GET /api/v1/tickets/:id
export async function getTicket(ticketId, user) {
  const ticket = await getTicketOrThrow(ticketId);

  assertCanAccessTicket(ticket, user);

  await ticket.populate("categoryId", "name description");

  return ticket;
}

// PATCH /api/v1/tickets/:id
export async function updateTicket(ticketId, data, user) {
  const ticket = await getTicketOrThrow(ticketId);

  assertCanAccessTicket(ticket, user);

  // Customers may edit their own ticket's description/subject.
  // Only staff may change category or priority.
  if (!isStaff(user)) {
    const forbiddenFields = ["categoryId", "priority", "tags"];

    if (forbiddenFields.some((field) => data[field] !== undefined)) {
      throw createError(
        "Only support staff can update category, priority, or tags",
        403
      );
    }

    if (["resolved", "closed"].includes(ticket.status)) {
      throw createError(
        "A resolved or closed ticket cannot be edited",
        409
      );
    }
  }

  const oldCategoryId = ticket.categoryId
    ? String(ticket.categoryId)
    : null;
  const oldPriority = ticket.priority;

  if (data.subject !== undefined) ticket.subject = data.subject;
  if (data.description !== undefined) {
    ticket.description = data.description;
  }
  if (data.categoryId !== undefined) {
    const category = await getActiveCategoryOrThrow(data.categoryId);
    ticket.categoryId = category._id;
  }
  if (data.priority !== undefined) ticket.priority = data.priority;
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

  await ticket.populate("categoryId", "name description");

  return ticket;
}

// PATCH /api/v1/tickets/:id/status
export async function updateTicketStatus(ticketId, data, user) {
  assertAuthenticated(user);

  if (!isStaff(user)) {
    throw createError("Only support staff can change ticket status", 403);
  }

  const ticket = await getTicketOrThrow(ticketId);
  const oldStatus = ticket.status;
  const newStatus = data.status;

  if (oldStatus === newStatus) {
    return ticket;
  }

  ticket.status = newStatus;

  if (newStatus === "resolved") {
    ticket.resolvedAt = new Date();
    ticket.closedAt = null;
  } else if (newStatus === "closed") {
    ticket.closedAt = new Date();

    if (!ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
  } else {
    ticket.resolvedAt = null;
    ticket.closedAt = null;
  }

  await ticket.save();

  let action = "status_changed";

  if (newStatus === "resolved") action = "resolved";
  if (newStatus === "closed") action = "closed";
  if (newStatus === "reopened") action = "reopened";

  await recordActivity({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action,
    oldValue: oldStatus,
    newValue: newStatus,
    metadata: data.note ? { note: data.note } : {},
  });

  return ticket;
}

// PATCH /api/v1/tickets/:id/assign
export async function assignTicket(ticketId, data, user) {
  assertAuthenticated(user);

  if (!isStaff(user)) {
    throw createError("Only support staff can assign tickets", 403);
  }

  const ticket = await getTicketOrThrow(ticketId);
  const previousAssignee = ticket.assignedTo
    ? String(ticket.assignedTo)
    : null;

  const nextAssignee = data.assignedTo
    ? String(data.assignedTo)
    : null;

  if (previousAssignee === nextAssignee) {
    return ticket;
  }

  ticket.assignedTo = data.assignedTo;
  await ticket.save();

  await recordActivity({
    ticketId: ticket._id,
    actorId: getUserId(user),
    action: previousAssignee ? "reassigned" : "assigned",
    oldValue: previousAssignee,
    newValue: nextAssignee,
  });

  return ticket;
}