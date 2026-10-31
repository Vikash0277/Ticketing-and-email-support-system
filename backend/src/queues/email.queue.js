import { Queue } from "bullmq";
import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required");
}

export const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("ticket-email", {
  connection: redisConnection,
});

export async function queueEmail(name, data, jobId) {
  return emailQueue.add(name, data, {
    jobId,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}