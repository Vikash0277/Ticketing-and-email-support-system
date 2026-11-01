import env from "../../config/env.js";
import logger from "../../config/logger.js";
import EmailEvent from "./emailEvent.model.js";
import User from "../user/user.model.js";
import { dispatchEmail } from "./email.dispatcher.js";
import {
  createReplyToken,
  hashReplyToken,
  makeReplyAddress,
} from "./email-token.js";
import {
  ticketCreatedTemplate,
  assignmentTemplate,
  statusTemplate,
  replyTemplate,
  customerMessageTemplate,
  emailLayout,
} from "./email.templates.js";

export function emailThreadingEnabled() {
  return Boolean(env.email.enabled && env.EMAIL_FROM && env.email.replyDomain);
}

function senderAddress() {
  const value = env.EMAIL_FROM || "";
  return value.match(/<([^>]+)>/)?.[1]?.trim() || value;
}

async function ensureReplyToken(ticket) {
  const token = createReplyToken(ticket._id.toString());
  const tokenHash = hashReplyToken(token);

  if (ticket.emailReplyTokenHash !== tokenHash) {
    ticket.emailReplyTokenHash = tokenHash;
    await ticket.save();
  }

  return makeReplyAddress(token);
}

async function sendOutboundEmail({
  ticket,
  recipient,
  subject,
  html,
  text,
  replyTo,
  kind,
}) {
  const event = await EmailEvent.create({
    ticketId: ticket._id,
    direction: "outbound",
    status: "processing",
    from: env.EMAIL_FROM,
    to: [recipient],
    subject,
    attempts: 0,
    metadata: { kind },
  });

  try {
    await dispatchEmail({
      eventId: event._id.toString(),
      ticketId: ticket._id.toString(),
      recipient,
      subject,
      html,
      text,
      replyTo,
      kind,
    });
  } catch (error) {
    logger.error("Unable to dispatch outbound email", {
      eventId: event._id.toString(),
      kind,
      message: error.message,
    });

    event.status = "failed";
    event.error = error.message;
    await event.save();

    throw error;
  }

  return EmailEvent.findById(event._id);
}

async function safeSend(kind, fn) {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Failed to send ${kind} email`, {
      message: error.message,
    });
    return null;
  }
}

export async function sendTicketConfirmation(ticket) {
  if (!emailThreadingEnabled()) {
    logger.info("Ticket confirmation email skipped (email threading disabled)", {
      ticketId: ticket._id.toString(),
    });
    return null;
  }

  return safeSend("ticket-created", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = ticketCreatedTemplate(ticket);

    return sendOutboundEmail({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: "ticket-created",
    });
  });
}

export async function sendAssignmentNotification(
  ticket,
  agent,
  reassigned = false
) {
  if (!emailThreadingEnabled() || !agent?.email) return null;

  return safeSend("ticket-assigned", async () => {
    const template = assignmentTemplate(ticket, agent.name, reassigned);

    return sendOutboundEmail({
      ticket,
      recipient: agent.email,
      ...template,
      replyTo: senderAddress(),
      kind: reassigned ? "ticket-reassigned" : "ticket-assigned",
    });
  });
}

export async function sendStatusNotification(ticket) {
  if (!emailThreadingEnabled()) return null;

  if (!["resolved", "closed", "reopened"].includes(ticket.status)) {
    return null;
  }

  return safeSend(`ticket-${ticket.status}`, async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = statusTemplate(ticket, ticket.status);

    return sendOutboundEmail({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: `ticket-${ticket.status}`,
    });
  });
}

export async function sendAgentReply(ticket, messageBody) {
  if (!emailThreadingEnabled()) return null;

  return safeSend("agent-reply", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = replyTemplate(ticket, messageBody);

    return sendOutboundEmail({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: "agent-reply",
    });
  });
}

export async function sendCustomerMessage(ticket, messageBody) {
  if (!emailThreadingEnabled()) return null;

  const agent = ticket.assignedTo
    ? await User.findById(ticket.assignedTo)
    : null;

  const recipient = agent?.email || senderAddress();

  if (!recipient) return null;

  return safeSend("customer-message", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = customerMessageTemplate(ticket, messageBody);

    return sendOutboundEmail({
      ticket,
      recipient,
      ...template,
      replyTo,
      kind: "customer-message",
    });
  });
}

export async function sendCustomTicketEmail(ticket, { subject, body }) {
  if (!emailThreadingEnabled()) return null;

  const replyTo = await ensureReplyToken(ticket);

  return sendOutboundEmail({
    ticket,
    recipient: ticket.requesterEmail,
    subject,
    html: emailLayout({
      title: subject,
      ticket,
      content: `<div style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px">${String(
        body
      )
        .replace(/[&<>"']/g, (character) => {
          const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          };
          return entities[character];
        })}</div>`,
    }),
    text: `${body}\n\nTicket: ${ticket.ticketNumber}`,
    replyTo,
    kind: "ticket-custom",
  });
}
