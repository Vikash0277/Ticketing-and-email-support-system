import "dotenv/config";

import http from "node:http";

import app from "./src/app.js";
import env from "./src/config/env.js";
import logger from "./src/config/logger.js";
import dbConnection from "./src/database/mongoDB.js";

let server;
let shuttingDown = false;

async function startServer() {
  await dbConnection();

  server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`, {
      environment: env.NODE_ENV,
      docs: `http://localhost:${env.PORT}/api-docs`,
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully.`);

  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  const mongoose = (await import("mongoose")).default;
  await mongoose.connection.close();

  clearTimeout(forceExit);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
  shutdown("uncaughtException");
});

startServer().catch((error) => {
  logger.error("Failed to start server", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
