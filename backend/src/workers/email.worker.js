import { Worker } from "bullmq";

import { redisConnection } from "../jobs/email.queue.js";
import EmailEvent from "../modules/email/emailEvent.model.js";
import { sendProviderEmail } from "../modules/email/email.provider.js";
import { processInboundResendEmail } from "../modules/email/email.inbound.service.js";

const worker = new Worker(
  "ticket-email",
  async (job) => {
    if (job.name === "process-inbound-email") {
      return processInboundResendEmail(job.data);
    }

    if (job.name === "send-email") {
      const {
        eventId,
        recipient,
        subject,
        html,
        text,
        replyTo,
        ticketId,
        kind,
      } = job.data;

      const event = await EmailEvent.findById(eventId);

      if (!event) {
        throw new Error(`EmailEvent not found: ${eventId}`);
      }

      event.status = "processing";
      event.attempts += 1;
      await event.save();

      try {
        const result = await sendProviderEmail({
          to: recipient,
          subject,
          html,
          text,
          replyTo,
          headers: {
            "X-Ticket-ID": ticketId,
            "X-Ticket-Email-Type": kind,
          },
        });

        event.status = "sent";
        event.providerMessageId = result.providerMessageId;
        event.processedAt = new Date();
        await event.save();

        return {
          sent: true,
          eventId,
          providerMessageId: result.providerMessageId,
        };
      } catch (error) {
        event.status = "failed";
        event.error = error.message;
        await event.save();
        throw error;
      }
    }

    throw new Error(`Unknown email job: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.info(`Email job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Email job failed: ${job?.id}`, error.message);
});

worker.on("error", (error) => {
  console.error("Email worker error:", error.message);
});

console.info("Ticket email worker started");