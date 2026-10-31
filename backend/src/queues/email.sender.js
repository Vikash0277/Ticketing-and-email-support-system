import logger from "../config/logger.js";
import EmailEvent from "../modules/email/emailEvent.model.js";
import { sendProviderEmail } from "../modules/email/email.provider.js";

/**
 * Performs the actual provider send for a queued outbound email and keeps the
 * EmailEvent record in sync. Used both by the BullMQ worker and the inline
 * fallback when Redis is not available.
 */
export async function sendEmailEvent({
  eventId,
  recipient,
  subject,
  html,
  text,
  replyTo,
  ticketId,
  kind,
}) {
  const event = await EmailEvent.findById(eventId);

  if (!event) {
    throw new Error(`EmailEvent not found: ${eventId}`);
  }

  if (event.status === "sent") {
    return { sent: true, duplicate: true, eventId };
  }

  event.status = "processing";
  event.attempts += 1;
  event.error = undefined;
  await event.save();

  try {
    const result = await sendProviderEmail({
      to: recipient,
      subject,
      html,
      text,
      replyTo,
      headers: {
        ...(ticketId ? { "X-Ticket-ID": String(ticketId) } : {}),
        ...(kind ? { "X-Ticket-Email-Type": kind } : {}),
      },
    });

    event.status = "sent";
    event.providerMessageId = result.providerMessageId;
    event.processedAt = new Date();
    await event.save();

    logger.info("Outbound email processed", {
      eventId,
      kind,
      providerMessageId: result.providerMessageId,
    });

    return {
      sent: true,
      eventId,
      providerMessageId: result.providerMessageId,
    };
  } catch (error) {
    event.status = "failed";
    event.error = error.message;
    await event.save();

    logger.error("Outbound email failed", {
      eventId,
      kind,
      message: error.message,
    });

    throw error;
  }
}

export default sendEmailEvent;
