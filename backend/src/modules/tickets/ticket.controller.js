// src/modules/tickets/ticket.controller.js

import * as ticketService from "./ticket.service.js";

export async function createTicket(req, res, next) {
  try {
    const ticket = await ticketService.createTicket(
      req.validatedBody,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function listTickets(req, res, next) {
  try {
    const result = await ticketService.listTickets(
      req.validatedQuery,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.tickets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicket(
      req.validatedParams.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicket(req, res, next) {
  try {
    const ticket = await ticketService.updateTicket(
      req.validatedParams.id,
      req.validatedBody,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const ticket = await ticketService.updateTicketStatus(
      req.validatedParams.id,
      req.validatedBody,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignTicket(req, res, next) {
  try {
    const ticket = await ticketService.assignTicket(
      req.validatedParams.id,
      req.validatedBody,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Ticket assigned successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}