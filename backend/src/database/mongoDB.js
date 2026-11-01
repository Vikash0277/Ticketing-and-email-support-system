import dns from "node:dns";
import mongoose from "mongoose";

import env from "../config/env.js";
import logger from "../config/logger.js";

export default async function dbConnection(uri) {
  const mongoUri =
    uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticketingSystem";

  if (env.isDevelopment) {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("MongoDB connected", {
      database: mongoose.connection.name,
    });
  } catch (error) {
    logger.error("MongoDB connection failed", { message: error.message });
    throw error;
  }

  return mongoose.connection;
}
