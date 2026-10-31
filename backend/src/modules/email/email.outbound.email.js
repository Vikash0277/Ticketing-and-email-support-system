import EmailEvent from "./emailEvent.model.js";
import Ticket from "../tickets/ticket.model.js";
import { queueEmail } from "../../jobs/email.queue.js";
import { createReplyToken, makeReplyAddress } from "./email-token.js";
import {
  ticketCreatedTemplate,
  assignmentTemplate,
  statusTemplate,
  replyTemplate,
} from "./email.templates.js";

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
    from: process.env.EMAIL_FROM,
    to: [recipient],
    subject,
    attempts: 0,
    metadata: { kind },
  });

  try {
    await queueEmail(
      "send-email",
      {
        eventId: event._id.toString(),
        ticketId: ticket._id.toString(),
        recipient,
        subject,
        html,
        text,
        replyTo,
        kind,
      },
      `outbound-${event._id}`
    );
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();
    throw error;
  }

  return event;
}

export async function queueTicketConfirmation(ticket) {
  const replyToken = createReplyToken(ticket._id.toString());
  const tokenHash = (await import("node:crypto")).default
    .createHash("sha256")
    .update(replyToken)
    .digest("hex");

  // Save only the hash; never store the raw reply token on the ticket.
  if (!ticket.emailReplyTokenHash) {
    ticket.emailReplyTokenHash = tokenHash;
    await ticket.save();
  }

  const template = ticketCreatedTemplate(ticket);

  return enqueueOutbound({
    ticket,
    recipient: ticket.requesterEmail,
    ...template,
    replyTo: makeReplyAddress(replyToken),
    kind: "ticket-created",
  });
}

export async function queueAssignmentNotification(ticket, agent, reassigned = false) {
  if (!agent?.email) return null;

  const template = assignmentTemplate(
    ticket,
    agent.name,
    reassigned
  );

  return enqueueOutbound({
    ticket,
    recipient: agent.email,
    ...template,
    replyTo: process.env.EMAIL_FROM.match(/<([^>]+)>/)?.[1]
      || process.env.EMAIL_FROM,
    kind: reassigned ? "ticket-reassigned" : "ticket-assigned",
  });
}

export async function queueStatusNotification(ticket) {
  if (!["resolved", "closed", "reopened"].includes(ticket.status)) {
    return null;
  }

  const template = statusTemplate(ticket, ticket.status);

  return enqueueOutbound({
    ticket,
    recipient: ticket.requesterEmail,
    ...template,
    replyTo: makeReplyAddress(
      createReplyToken(ticket._id.toString())
    ),
    kind: `ticket-${ticket.status}`,
  });
}

export async function queueAgentReply(ticket, messageBody) {
  const template = replyTemplate(ticket, messageBody);

  return enqueueOutbound({
    ticket,
    recipient: ticket.requesterEmail,
    ...template,
    replyTo: makeReplyAddress(
      createReplyToken(ticket._id.toString())
    ),
    kind: "agent-reply",
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