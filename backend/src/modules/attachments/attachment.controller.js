import fs from "node:fs";

import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { resolveLocalPath } from "../../services/storage.service.js";
import TicketMessage from "../ticketMessage/ticketMessage.model.js";
import Ticket from "../tickets/ticket.model.js";

export const downloadLocalAttachment = asyncHandler(async (req, res) => {
  const { key } = req.params;

  if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
    throw ApiError.badRequest("Invalid attachment key");
  }

  const message = await TicketMessage.findOne({
    "attachments.storageKey": key,
  }).select("_id ticketId");

  if (!message) {
    throw ApiError.notFound("Attachment not found");
  }

  const ticket = await Ticket.findById(message.ticketId).select(
    "requesterId assignedTo"
  );

  if (!ticket) {
    throw ApiError.notFound("Attachment not found");
  }

  const isStaff = ["agent", "admin"].includes(req.user.role);

  if (!isStaff && String(ticket.requesterId) !== String(req.user.id)) {
    throw ApiError.forbidden("You are not allowed to access this attachment");
  }

  const filePath = resolveLocalPath(key);

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound("Attachment file is no longer available");
  }

  return res.download(filePath, key);
});
