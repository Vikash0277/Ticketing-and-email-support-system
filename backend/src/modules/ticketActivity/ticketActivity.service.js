import mongoose from "mongoose";

import Ticket from "../tickets/ticket.model.js";
import TicketActivity from "./ticketActivity.model.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function isStaff(user) {
  return ["agent", "admin"].includes(user?.role);
}

async function getAccessibleTicket(ticketId, user) {
  if (!getUserId(user)) {
    throw createError("Authentication required", 401);
  }

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
    throw createError(
      "You are not allowed to access this ticket",
      403
    );
  }

  return ticket;
}

function buildActivityFilter(ticketId, user) {
  const filter = { ticketId };

  // Do not reveal internal-note activity to customers.
  if (!isStaff(user)) {
    filter.action = { $ne: "internal_note_added" };
  }

  return filter;
}

// GET /api/v1/tickets/:ticketId/activities
export async function listTicketActivities(ticketId, query, user) {
  const ticket = await getAccessibleTicket(ticketId, user);

  const { page, limit, sortOrder } = query;
  const filter = buildActivityFilter(ticket._id, user);

  const skip = (page - 1) * limit;
  const direction = sortOrder === "asc" ? 1 : -1;

  const [activities, total] = await Promise.all([
    TicketActivity.find(filter)
      .sort({ createdAt: direction, _id: direction })
      .skip(skip)
      .limit(limit)
      .lean(),

    TicketActivity.countDocuments(filter),
  ]);

  return {
    activities,
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

// GET /api/v1/tickets/:ticketId/activities/:activityId
export async function getTicketActivity(
  ticketId,
  activityId,
  user
) {
  const ticket = await getAccessibleTicket(ticketId, user);

  if (!mongoose.isValidObjectId(activityId)) {
    throw createError("Invalid activity ID", 400);
  }

  const filter = {
    _id: activityId,
    ...buildActivityFilter(ticket._id, user),
  };

  const activity = await TicketActivity.findOne(filter).lean();

  if (!activity) {
    throw createError("Activity not found", 404);
  }

  return activity;
}