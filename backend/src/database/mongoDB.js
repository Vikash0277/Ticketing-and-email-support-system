import mongoose from "mongoose";

import logger from "../config/logger.js";

export default async function dbConnection(uri) {
  const mongoUri =
    uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticketingSystem";

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
