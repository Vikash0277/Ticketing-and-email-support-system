import { Queue } from "bullmq";
import IORedis from "ioredis";

import env from "../config/env.js";
import logger from "../config/logger.js";

let connection = null;
let emailQueue = null;

export const EMAIL_QUEUE_NAME = "ticket-email";

export function getRedisConnection() {
  if (!env.REDIS_URL) return null;

  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    connection.on("error", (error) => {
      logger.error("Redis connection error", { message: error.message });
    });
  }

  return connection;
}

export function getEmailQueue() {
  if (!env.queue.enabled) return null;

  if (!emailQueue) {
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }

  return emailQueue;
}

export async function queueEmail(name, data, jobId) {
  const queue = getEmailQueue();

  if (!queue) {
    throw new Error("Email queue is not configured (REDIS_URL missing)");
  }

  return queue.add(name, data, { jobId });
}

export async function closeQueue() {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }

  if (connection) {
    await connection.quit();
    connection = null;
  }
}
