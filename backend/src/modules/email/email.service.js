
import { Resend } from "resend";
import mongoose from "mongoose";
import EmailEvent from "./emailEvent.model.js";
import Ticket from "../tickets/ticket.model.js";
import TicketMessage from "../ticketMessage/ticketMessage.model.js";
import TicketActivity from "../ticketActivity/ticketActivity.model.js";


function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing from environment variables");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) {
    throw new Error("Email recipient, subject, and text are required");
  }

  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: [to],
    subject,
    text,
  });

  if (error) {
    console.error("Resend email failed:", error.message);

    const sendError = new Error("Failed to send email");
    sendError.statusCode = 502;
    throw sendError;
  }

  return data;
}

export async function sendVerificationEmail(to, subject, text) {
  return sendEmail(to, subject, text);
}

export async function sendLoginOtpEmail(to, subject, text) {
  return sendEmail(to, subject, text);
}

export async function sendPasswordResetEmail(to, subject, text) {
  return sendEmail(to, subject, text);
}

export async function sendPhoneOtp(to, subject, text) {
  throw new Error(
    "SMS is not configured. Use an SMS provider for phone OTP delivery."
  );
}

function extractTicketNumber(subject = "") {
  return subject.match(/\bTKT-[A-Z0-9-]+\b/i)?.[0]?.toUpperCase();
}

function getEmailAddress(value = "") {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export async function processInboundEmail(payload) {
  const {
    providerEventId,
    providerMessageId,
    messageId,
    from,
    to = [],
    subject = "",
    text = "",
    metadata = {},
  } = payload;

  if (!from || !text.trim()) {
    throw Object.assign(
      new Error("Inbound email must include sender and message text"),
      { statusCode: 400 }
    );
  }

  // Idempotency: do not process a provider event twice.
  if (providerEventId) {
    const existing = await EmailEvent.findOne({ providerEventId });

    if (existing?.status === "received" || existing?.status === "processing") {
      return { duplicate: true, event: existing };
    }

    if (existing?.status === "processed") {
      return { duplicate: true, event: existing };
    }
  }

  const event = await EmailEvent.create({
    providerEventId,
    providerMessageId,
    messageId,
    direction: "inbound",
    status: "processing",
    from: getEmailAddress(from),
    to: to.map(getEmailAddress),
    subject,
    metadata,
    attempts: 1,
  });

  try {
    const ticketNumber = extractTicketNumber(subject);

    if (!ticketNumber) {
      event.status = "ignored";
      event.error = "No ticket number found in email subject";
      await event.save();
      return { ignored: true };
    }

    const ticket = await Ticket.findOne({ ticketNumber });

    if (!ticket) {
      event.status = "ignored";
      event.error = "Ticket not found";
      await event.save();
      return { ignored: true };
    }

    const senderEmail = getEmailAddress(from);

    // Only accept email replies from the ticket requester.
    if (senderEmail !== ticket.requesterEmail.toLowerCase()) {
      event.status = "ignored";
      event.error = "Sender does not match ticket requester";
      await event.save();
      return { ignored: true };
    }

    // Avoid duplicate messages when a provider retries delivery.
    if (messageId) {
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
    }

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderId: ticket.requesterId ?? null,
      senderName: ticket.requesterName || senderEmail,
      senderEmail,
      senderRole: "customer",
      type: "public",
      body: text.trim(),
      source: "email",
      emailMessageId: messageId || undefined,
      receivedAt: new Date(),
    });

    ticket.lastMessageAt = message.createdAt;

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
      metadata: {
        source: "email",
        messageId: message._id,
      },
    });

    event.ticketId = ticket._id;
    event.status = "processed";
    event.processedAt = new Date();
    await event.save();

    return { ticketId: ticket._id, messageId: message._id };
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();
    throw error;
  }
}

export async function sendOutboundEmail({ ticketId, subject, body, user }) {
  if (!mongoose.isValidObjectId(ticketId)) {
    throw Object.assign(new Error("Invalid ticket ID"), {
      statusCode: 400,
    });
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw Object.assign(new Error("Ticket not found"), {
      statusCode: 404,
    });
  }

  const event = await EmailEvent.create({
    ticketId: ticket._id,
    direction: "outbound",
    status: "queued",
    from: process.env.GMAIL_USER,
    to: [ticket.requesterEmail],
    subject,
    attempts: 0,
  });

  try {
    event.status = "processing";
    event.attempts += 1;
    await event.save();

    const result = await sendEmail(ticket.requesterEmail, subject, body);

    event.status = "sent";
    event.messageId = result.messageId;
    event.providerMessageId = result.messageId;
    event.processedAt = new Date();
    await event.save();

    const senderId = user?._id ?? user?.id ?? null;

    const message = await TicketMessage.create({
      ticketId: ticket._id,
      senderId,
      senderName: user?.name || "Support",
      senderEmail: process.env.GMAIL_USER,
      senderRole: user?.role === "admin" ? "admin" : "agent",
      type: "public",
      body,
      source: "web",
      emailMessageId: result.messageId || undefined,
    });

    ticket.lastMessageAt = message.createdAt;

    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = message.createdAt;
    }

    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: senderId,
      action: "replied",
      metadata: {
        source: "web",
        messageId: message._id,
        emailEventId: event._id,
      },
    });

    return { event, message };
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();
    throw error;
  }
}
