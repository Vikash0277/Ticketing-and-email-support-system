import sanitizeHtml from "sanitize-html";

import logger from "../../config/logger.js";
import EmailEvent from "./emailEvent.model.js";
import Ticket from "../tickets/ticket.model.js";
import TicketMessage from "../ticketMessage/ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";
import {
  getReceivedEmail,
  listReceivedAttachments,
} from "./email.provider.js";
import { extractReplyToken, hashReplyToken } from "./email-token.js";

function normalizeEmail(value = "") {
  const match = String(value).match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function headerValue(headers, name) {
  if (!headers) return undefined;

  if (Array.isArray(headers)) {
    const entry = headers.find(
      (header) =>
        header.key?.toLowerCase() === name.toLowerCase() ||
        header.name?.toLowerCase() === name.toLowerCase()
    );
    return entry?.value;
  }

  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === name.toLowerCase()
  );

  return key ? headers[key] : undefined;
}

function cleanPlainText(text = "") {
  const quoteMarkers = [
    /^On .+wrote:$/im,
    /^From:\s.+$/im,
    /^-{2,}\s*Original Message\s*-{2,}$/im,
  ];

  let result = String(text);

  for (const marker of quoteMarkers) {
    const index = result.search(marker);
    if (index > 0) {
      result = result.slice(0, index);
    }
  }

  return result.trim();
}

function sanitizeIncomingBody({ text, html }) {
  if (text?.trim()) {
    return cleanPlainText(text);
  }

  return sanitizeHtml(html || "", {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

function normalizeAttachments(attachments = []) {
  return attachments
    .filter((attachment) => attachment?.filename)
    .map((attachment) => ({
      filename: attachment.filename,
      contentType:
        attachment.contentType || attachment.content_type || "application/octet-stream",
      size: Number(attachment.size) || 0,
      storageKey: attachment.storageKey || attachment.id || attachment.download_url,
      url: attachment.url || attachment.download_url,
      provider: attachment.provider || "resend",
    }));
}

/**
 * Shared inbound processing for both the live Resend webhook and the local
 * simulator. Returns a small result object describing what happened.
 */
export async function processInboundEmailPayload(payload) {
  const providerEventId =
    payload.providerEventId ||
    `inbound:${payload.messageId || payload.emailId || Date.now()}`;

  let event;

  try {
    event = await EmailEvent.create({
      providerEventId,
      providerMessageId: payload.emailId,
      messageId: payload.messageId,
      direction: "inbound",
      status: "processing",
      from: normalizeEmail(payload.from),
      to: (payload.to || []).map(normalizeEmail),
      subject: payload.subject || "",
      attempts: 1,
      metadata: {
        source: payload.source || "resend",
        receivedAt: payload.receivedAt || new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return { duplicate: true };
    }
    throw error;
  }

  try {
    const from = normalizeEmail(payload.from);
    const to = payload.to || [];
    const token = extractReplyToken(to);

    if (!token) {
      event.status = "ignored";
      event.error = "No secure ticket reply address found";
      await event.save();
      return { ignored: true, reason: "missing-reply-token" };
    }

    const ticket = await Ticket.findOne({
      emailReplyTokenHash: hashReplyToken(token),
    }).select("+emailReplyTokenHash");

    if (!ticket) {
      event.status = "ignored";
      event.error = "Invalid ticket reply token";
      await event.save();
      return { ignored: true, reason: "invalid-reply-token" };
    }

    if (from !== String(ticket.requesterEmail).toLowerCase()) {
      event.status = "ignored";
      event.error = "Sender email does not match ticket requester";
      await event.save();
      return { ignored: true, reason: "sender-mismatch" };
    }

    const messageId =
      payload.messageId || `inbound:${event._id.toString()}`;

    const existingMessage = await TicketMessage.findOne({
      emailMessageId: messageId,
    });

    if (existingMessage) {
      event.ticketId = ticket._id;
      event.status = "processed";
      event.processedAt = new Date();
      await event.save();

      return { duplicate: true, ticketId: ticket._id };
    }

    const body = sanitizeIncomingBody(payload);

    if (!body) {
      event.status = "ignored";
      event.error = "Inbound email contains no usable text";
      await event.save();
      return { ignored: true, reason: "empty-body" };
    }

    const receivedAt = payload.receivedAt
      ? new Date(payload.receivedAt)
      : new Date();

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderId: ticket.requesterId ?? null,
      senderName: ticket.requesterName || from,
      senderEmail: from,
      senderRole: "customer",
      type: "public",
      body,
      source: "email",
      emailMessageId: messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      receivedAt,
      attachments: normalizeAttachments(payload.attachments),
    });

    const oldStatus = ticket.status;

    ticket.lastMessageAt = receivedAt;
    ticket.lastReplyBy = "customer";

    if (["resolved", "closed"].includes(ticket.status)) {
      ticket.status = "reopened";
      ticket.resolvedAt = null;
      ticket.closedAt = null;
    }

    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: ticket.requesterId ?? null,
      action: "replied",
      oldValue: oldStatus,
      newValue: ticket.status,
      metadata: {
        source: "email",
        messageId: message._id,
      },
    });

    if (oldStatus === "resolved" || oldStatus === "closed") {
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: ticket.requesterId ?? null,
        action: "reopened",
        oldValue: oldStatus,
        newValue: "reopened",
        metadata: { source: "email" },
      });
    }

    event.ticketId = ticket._id;
    event.status = "processed";
    event.processedAt = new Date();
    await event.save();

    logger.info("Inbound email processed", {
      ticketId: ticket._id.toString(),
      messageId: message._id.toString(),
      reopened: ["resolved", "closed"].includes(oldStatus),
    });

    return {
      processed: true,
      ticketId: ticket._id,
      messageId: message._id,
      reopened: ["resolved", "closed"].includes(oldStatus),
    };
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();
    throw error;
  }
}

/**
 * Live Resend flow: fetch the received email and its attachments by id, then
 * feed it through the shared processor.
 */
export async function processInboundResendEmail({
  emailId,
  providerEventId,
}) {
  if (!emailId) {
    throw new Error("emailId is required for inbound Resend processing");
  }

  const email = await getReceivedEmail(emailId);
  const to = Array.isArray(email.to)
    ? email.to
    : [email.to].filter(Boolean);

  let attachments = [];

  try {
    attachments = await listReceivedAttachments(emailId);
  } catch (error) {
    logger.warn("Unable to load inbound attachments", {
      emailId,
      message: error.message,
    });
  }

  return processInboundEmailPayload({
    emailId,
    providerEventId: providerEventId || `resend-received:${emailId}`,
    from: email.from,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    messageId:
      email.message_id ||
      headerValue(email.headers, "message-id") ||
      `resend:${emailId}`,
    inReplyTo: headerValue(email.headers, "in-reply-to"),
    references: headerValue(email.headers, "references"),
    receivedAt: email.created_at,
    attachments,
    source: "resend",
  });
}

export default processInboundResendEmail;
