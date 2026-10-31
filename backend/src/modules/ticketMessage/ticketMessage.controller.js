import fs from "node:fs";

import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import {
  resolveLocalPath,
  uploadFiles,
} from "../../services/storage.service.js";
import * as ticketMessageService from "./ticketMessage.service.js";

export const createTicketMessage = asyncHandler(async (req, res) => {
  const { ticketId } = req.validatedParams;

  const attachments = req.files?.length
    ? await uploadFiles(req.files)
    : [];

  const message = await ticketMessageService.createTicketMessage(
    ticketId,
    req.validatedBody,
    req.user,
    attachments
  );

  return sendSuccess(res, 201, "Message added successfully", message);
});

export const listTicketMessages = asyncHandler(async (req, res) => {
  const { ticketId } = req.validatedParams;

  const result = await ticketMessageService.listTicketMessages(
    ticketId,
    req.validatedQuery,
    req.user
  );

  return sendPaginated(
    res,
    "Messages fetched successfully",
    result.messages,
    result.pagination
  );
});

export const getTicketMessage = asyncHandler(async (req, res) => {
  const { ticketId, messageId } = req.validatedParams;

  const message = await ticketMessageService.getTicketMessage(
    ticketId,
    messageId,
    req.user
  );

  return sendSuccess(res, 200, "Message fetched successfully", message);
});

export const downloadMessageAttachment = asyncHandler(async (req, res) => {
  const { ticketId, messageId, attachmentId } = req.validatedParams;

  const { attachment } = await ticketMessageService.getMessageAttachment(
    ticketId,
    messageId,
    attachmentId,
    req.user
  );

  if (attachment.provider === "cloudinary" && attachment.url) {
    return res.redirect(attachment.url);
  }

  if (attachment.provider !== "local") {
    if (attachment.url) return res.redirect(attachment.url);

    throw ApiError.notFound("Attachment file is not available");
  }

  const filePath = resolveLocalPath(attachment.storageKey);

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound("Attachment file is no longer available");
  }

  return res.download(filePath, attachment.filename);
});
