import env from "../../config/env.js";
import logger from "../../config/logger.js";
import EmailEvent from "./emailEvent.model.js";
import Ticket from "../tickets/ticket.model.js";
import User from "../user/user.model.js";
import { dispatchEmail } from "../../queues/email.dispatcher.js";
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

async function enqueueOutbound({
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
    status: "queued",
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

    return null;
  }

  return event;
}

async function safeQueue(kind, fn) {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Failed to queue ${kind} email`, {
      message: error.message,
    });
    return null;
  }
}

export async function queueTicketConfirmation(ticket) {
  if (!emailThreadingEnabled()) {
    logger.info("Ticket confirmation email skipped (email threading disabled)", {
      ticketId: ticket._id.toString(),
    });
    return null;
  }

  return safeQueue("ticket-created", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = ticketCreatedTemplate(ticket);

    return enqueueOutbound({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: "ticket-created",
    });
  });
}

export async function queueAssignmentNotification(
  ticket,
  agent,
  reassigned = false
) {
  if (!emailThreadingEnabled() || !agent?.email) return null;

  return safeQueue("ticket-assigned", async () => {
    const template = assignmentTemplate(ticket, agent.name, reassigned);

    return enqueueOutbound({
      ticket,
      recipient: agent.email,
      ...template,
      replyTo: senderAddress(),
      kind: reassigned ? "ticket-reassigned" : "ticket-assigned",
    });
  });
}

export async function queueStatusNotification(ticket) {
  if (!emailThreadingEnabled()) return null;

  if (!["resolved", "closed", "reopened"].includes(ticket.status)) {
    return null;
  }

  return safeQueue(`ticket-${ticket.status}`, async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = statusTemplate(ticket, ticket.status);

    return enqueueOutbound({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: `ticket-${ticket.status}`,
    });
  });
}

export async function queueAgentReply(ticket, messageBody) {
  if (!emailThreadingEnabled()) return null;

  return safeQueue("agent-reply", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = replyTemplate(ticket, messageBody);

    return enqueueOutbound({
      ticket,
      recipient: ticket.requesterEmail,
      ...template,
      replyTo,
      kind: "agent-reply",
    });
  });
}

export async function queueCustomerMessage(ticket, messageBody) {
  if (!emailThreadingEnabled()) return null;

  const agent = ticket.assignedTo
    ? await User.findById(ticket.assignedTo)
    : null;

  const recipient = agent?.email || senderAddress();

  if (!recipient) return null;

  return safeQueue("customer-message", async () => {
    const replyTo = await ensureReplyToken(ticket);
    const template = customerMessageTemplate(ticket, messageBody);

    return enqueueOutbound({
      ticket,
      recipient,
      ...template,
      replyTo,
      kind: "customer-message",
    });
  });
}

export async function queueCustomTicketEmail(ticket, { subject, body }) {
  if (!emailThreadingEnabled()) return null;

  return safeQueue("ticket-custom", async () => {
    const replyTo = await ensureReplyToken(ticket);

    return enqueueOutbound({
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
  });
}

export async function queueEmailFromTicketId(ticketId, kind, payload = {}) {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (kind === "ticket-created") {
    return queueTicketConfirmation(ticket);
  }

  if (kind === "ticket-status") {
    return queueStatusNotification(ticket);
  }

  if (kind === "agent-reply") {
    return queueAgentReply(ticket, payload.body);
  }

  throw new Error(`Unsupported email job type: ${kind}`);
}
