
import winston from "winston";
import fs from "node:fs";
import path from "node:path";

const logDirectory = path.resolve("logs");

fs.mkdirSync(logDirectory, { recursive: true });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "http",

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  defaultMeta: {
    service: "ticketing-api",
  },

  transports: [
    new winston.transports.Console(),

    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),

    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
    }),
  ],
});

export default logger;
