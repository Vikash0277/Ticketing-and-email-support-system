import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import * as ticketService from "./ticket.service.js";
import { uploadFiles } from "../../services/storage.service.js";

export const createTicket = asyncHandler(async (req, res) => {
  const attachments = req.files?.length
    ? await uploadFiles(req.files)
    : [];

  const ticket = await ticketService.createTicket(
    req.validatedBody,
    req.user,
    attachments
  );

  return sendSuccess(res, 201, "Ticket created successfully", ticket);
});

export const listTickets = asyncHandler(async (req, res) => {
  const result = await ticketService.listTickets(req.validatedQuery, req.user);

  return sendPaginated(
    res,
    "Tickets fetched successfully",
    result.tickets,
    result.pagination
  );
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicket(
    req.validatedParams.id,
    req.user
  );

  return sendSuccess(res, 200, "Ticket fetched successfully", ticket);
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicket(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket updated successfully", ticket);
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicketStatus(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket status updated successfully", ticket);
});

export const resolveTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.resolveTicket(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket resolved successfully", ticket);
});

export const reopenTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.reopenTicket(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket reopened successfully", ticket);
});

export const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.closeTicket(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket closed successfully", ticket);
});

export const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.assignTicket(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "Ticket assigned successfully", ticket);
});

export const getTicketStats = asyncHandler(async (req, res) => {
  const stats = await ticketService.getTicketStats(req.user);

  return sendSuccess(res, 200, "Ticket statistics fetched successfully", stats);
});
