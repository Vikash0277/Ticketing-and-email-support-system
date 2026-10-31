import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/response.js";
import env from "../../config/env.js";
import Ticket from "../tickets/ticket.model.js";
import EmailEvent from "./emailEvent.model.js";
import {
  processInboundEmailPayload,
  processInboundResendEmail,
} from "./email.inbound.service.js";
import {
  createReplyToken,
  hashReplyToken,
  makeReplyAddress,
} from "./email-token.js";
import { queueCustomTicketEmail } from "./email.outbound.email.js";

/**
 * POST /email/inbound
 * Resend webhook endpoint. Verified by the Svix middleware before this runs.
 */
export const inboundWebhook = asyncHandler(async (req, res) => {
  const event = req.webhookPayload || req.body || {};
  const type = event.type || event.event || "";

  // Resend delivers `email.received` events. Other event types are acknowledged
  // so Resend does not retry them forever.
  if (!type.startsWith("email.received")) {
    return sendSuccess(res, 200, "Webhook acknowledged", {
      ignored: true,
      type,
    });
  }

  const data = event.data || {};
  const emailId = data.email_id || data.emailId || data.id;

  if (!emailId) {
    throw ApiError.badRequest("Webhook payload is missing the email id");
  }

  const result = await processInboundResendEmail({
    emailId,
    providerEventId: event.id || data.id,
  });

  return sendSuccess(
    res,
    200,
    result.duplicate
      ? "Duplicate email event acknowledged"
      : result.ignored
        ? "Inbound email ignored"
        : "Inbound email processed",
    result
  );
});

/**
 * POST /email/inbound/simulate
 * Development helper: inject an inbound customer email without a live domain.
 */
export const simulateInbound = asyncHandler(async (req, res) => {
  if (env.isProduction) {
    throw ApiError.forbidden("The inbound email simulator is disabled in production");
  }

  const { ticketId, from, subject, text, messageId } = req.validatedBody;

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) throw ApiError.notFound("Ticket not found");

  const token = createReplyToken(ticket._id.toString());
  const replyAddress = makeReplyAddress(token);

  // Persist the token hash so the shared processor can resolve the ticket even
  // when outbound email threading is not configured.
  const tokenHash = hashReplyToken(token);

  if (ticket.emailReplyTokenHash !== tokenHash) {
    ticket.emailReplyTokenHash = tokenHash;
    await ticket.save();
  }

  const result = await processInboundEmailPayload({
    providerEventId: `simulate:${messageId || Date.now()}`,
    messageId: messageId || `<simulated-${Date.now()}@bitmax.test>`,
    from: from || ticket.requesterEmail,
    to: replyAddress ? [replyAddress] : [`reply+${token}@localhost`],
    subject: subject || `Re: [${ticket.ticketNumber}] ${ticket.subject}`,
    text,
    source: "simulator",
  });

  return sendSuccess(res, 200, "Simulated inbound email processed", result);
});

/**
 * POST /email/outbound
 * Staff-initiated outbound email for a ticket.
 */
export const sendOutbound = asyncHandler(async (req, res) => {
  const { ticketId, subject, body } = req.validatedBody;

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) throw ApiError.notFound("Ticket not found");

  const event = await queueCustomTicketEmail(ticket, { subject, body });

  if (!event) {
    return sendSuccess(res, 200, "Email threading is not configured; email was not sent", {
      queued: false,
      configured: false,
    });
  }

  return sendSuccess(res, 200, "Outbound email queued", {
    queued: true,
    eventId: event._id,
  });
});

/**
 * GET /email/events?ticketId=...
 * Staff view of outbound/inbound email history for troubleshooting.
 */
export const listEmailEvents = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.validatedQuery.ticketId) {
    filter.ticketId = req.validatedQuery.ticketId;
  }

  const events = await EmailEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(req.validatedQuery.limit)
    .lean();

  return sendSuccess(res, 200, "Email events fetched successfully", events);
});
