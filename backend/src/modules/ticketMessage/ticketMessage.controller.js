import * as ticketMessageService from "./ticketMessage.service.js";

import {
  ticketMessageParamsSchema,
  messageIdParamsSchema,
  listTicketMessagesSchema,
} from "./ticketMessage.validation.js";

export async function createTicketMessage(req, res, next) {
  try {
    const { ticketId } = ticketMessageParamsSchema.parse(req.params);

    const message = await ticketMessageService.createTicketMessage(
      ticketId,
      req.validatedBody,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Message added successfully",
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

export async function listTicketMessages(req, res, next) {
  try {
    const { ticketId } = ticketMessageParamsSchema.parse(req.params);
    const query = listTicketMessagesSchema.parse(req.query);

    const result = await ticketMessageService.listTicketMessages(
      ticketId,
      query,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketMessage(req, res, next) {
  try {
    const { ticketId, messageId } =
      messageIdParamsSchema.parse(req.params);

    const message = await ticketMessageService.getTicketMessage(
      ticketId,
      messageId,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
}