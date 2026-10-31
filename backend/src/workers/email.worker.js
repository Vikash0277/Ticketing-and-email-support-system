import "dotenv/config";

import { Worker } from "bullmq";
import mongoose from "mongoose";

import logger from "../config/logger.js";
import dbConnection from "../database/mongoDB.js";
import {
  EMAIL_QUEUE_NAME,
  closeQueue,
  getRedisConnection,
} from "../queues/email.queue.js";
import { sendEmailEvent } from "../queues/email.sender.js";
import { processInboundResendEmail } from "../modules/email/email.inbound.service.js";

let worker = null;

async function processJob(job) {
  if (job.name === "process-inbound-email") {
    return processInboundResendEmail(job.data);
  }

  if (job.name === "send-email") {
    return sendEmailEvent(job.data);
  }

  throw new Error(`Unknown email job: ${job.name}`);
}

async function start() {
  await dbConnection();

  const connection = getRedisConnection();

  if (!connection) {
    logger.error("REDIS_URL is not configured; email worker cannot start");
    process.exit(1);
  }

  worker = new Worker(EMAIL_QUEUE_NAME, processJob, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logger.info("Email job completed", { jobId: job.id, name: job.name });
  });

  worker.on("failed", (job, error) => {
    logger.error("Email job failed", {
      jobId: job?.id,
      name: job?.name,
      message: error.message,
    });
  });

  worker.on("error", (error) => {
    logger.error("Email worker error", { message: error.message });
  });

  logger.info("Ticket email worker started");
}

async function shutdown(signal) {
  logger.info(`Email worker received ${signal}. Shutting down.`);

  if (worker) {
    await worker.close();
  }

  await closeQueue();
  await mongoose.connection.close();

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  logger.error("Email worker failed to start", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
