import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";

import EmailEvent from "./emailEvent.model.js";
import Ticket from "../tickets/ticket.model.js";
import TicketMessage from "../ticketMessage/ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";
import { getReceivedEmail } from "./email.provider.js";
import { hashReplyToken } from "./email-token.js";

function normalizeEmail(value = "") {
  const match = String(value).match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function headerValue(headers, name) {
  if (!headers) return undefined;

  if (Array.isArray(headers)) {
    const entry = headers.find(
      (header) => header.key?.toLowerCase() === name.toLowerCase()
        || header.name?.toLowerCase() === name.toLowerCase()
    );
    return entry?.value;
  }

  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === name.toLowerCase()
  );

  return key ? headers[key] : undefined;
}

function extractReplyToken(recipients = []) {
  for (const recipient of recipients) {
    const email = normalizeEmail(recipient);
    const match = email.match(/^reply\+([a-f0-9]{64})@/i);

    if (match) return match[1];
  }

  return null;
}

function cleanPlainText(text = "") {
  // Best-effort quoted-reply removal for common email clients.
  const quoteMarkers = [
    /^On .+wrote:$/im,
    /^From:\s.+$/im,
    /^-{2,}\s*Original Message\s*-{2,}$/im,
    /^>{1}\s?/m,
  ];

  let result = text;

  for (const marker of quoteMarkers) {
    const index = result.search(marker);
    if (index > 0) {
      result = result.slice(0, index);
    }
  }

  return result.trim();
}

function sanitizeIncomingBody(email) {
  if (email.text?.trim()) {
    return cleanPlainText(email.text);
  }

  // Convert incoming HTML into safe, plain text for storage.
  return sanitizeHtml(email.html || "", {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export async function processInboundResendEmail({
  emailId,
  providerEventId,
}) {
  const eventKey = providerEventId || `resend-received:${emailId}`;

  // Claim the event once. The unique providerEventId index prevents
  // duplicate processing when Resend retries a webhook.
  let event;

  try {
    event = await EmailEvent.create({
      providerEventId: eventKey,
      providerMessageId: emailId,
      direction: "inbound",
      status: "processing",
      attempts: 1,
    });
  } catch (error) {
    if (error.code === 11000) {
      return { duplicate: true };
    }

    throw error;
  }

  try {
    const email = await getReceivedEmail(emailId);

    const from = normalizeEmail(email.from);
    const to = Array.isArray(email.to) ? email.to : [email.to].filter(Boolean);
    const token = extractReplyToken(to);

    const messageId =
      email.message_id ||
      headerValue(email.headers, "message-id") ||
      `resend:${emailId}`;

    event.from = from;
    event.to = to.map(normalizeEmail);
    event.subject = email.subject || "";
    event.messageId = messageId;
    event.metadata = {
      resendEmailId: emailId,
      inReplyTo: headerValue(email.headers, "in-reply-to"),
      references: headerValue(email.headers, "references"),
      receivedAt: email.created_at || new Date().toISOString(),
    };

    if (!token) {
      event.status = "ignored";
      event.error = "No secure ticket reply address found";
      await event.save();
      return { ignored: true };
    }

    const tokenHash = hashReplyToken(token);

    const ticket = await Ticket.findOne({
      emailReplyTokenHash: tokenHash,
    }).select("+emailReplyTokenHash");

    if (!ticket) {
      event.status = "ignored";
      event.error = "Invalid ticket reply token";
      await event.save();
      return { ignored: true };
    }

    // Verify the sender; the reply token alone is not enough.
    if (from !== ticket.requesterEmail.toLowerCase()) {
      event.status = "ignored";
      event.error = "Sender email does not match ticket requester";
      await event.save();
      return { ignored: true };
    }

    // Deduplicate by RFC Message-ID as well as provider event ID.
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

    const body = sanitizeIncomingBody(email);

    if (!body) {
      event.status = "ignored";
      event.error = "Inbound email contains no usable text";
      await event.save();
      return { ignored: true };
    }

    const receivedAt = email.created_at
      ? new Date(email.created_at)
      : new Date();

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderId: ticket.requesterId ?? null,
      senderName: from,
      senderEmail: from,
      senderRole: "customer",
      type: "public",
      body,
      source: "email",
      emailMessageId: messageId,
      inReplyTo: headerValue(email.headers, "in-reply-to"),
      references: headerValue(email.headers, "references"),
      receivedAt,
      attachments: [],
    });

    const oldStatus = ticket.status;

    ticket.lastMessageAt = receivedAt;

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

    return {
      processed: true,
      ticketId: ticket._id,
      messageId: message._id,
    };
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();
    throw error;
  }
}