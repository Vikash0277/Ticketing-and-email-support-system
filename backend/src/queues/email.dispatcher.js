import logger from "../config/logger.js";
import { queueEmail } from "../queues/email.queue.js";
import { sendEmailEvent } from "../queues/email.sender.js";

/**
 * Tries the BullMQ queue first and falls back to an inline send. This keeps
 * local development working even when Redis or the worker is not running.
 */
export async function dispatchEmail(payload) {
  try {
    await queueEmail("send-email", payload, `outbound-${payload.eventId}`);
    return { queued: true };
  } catch (error) {
    logger.warn("Email queue unavailable, sending inline", {
      message: error.message,
      eventId: payload.eventId,
    });

    return sendEmailEvent(payload);
  }
}

export default dispatchEmail;
