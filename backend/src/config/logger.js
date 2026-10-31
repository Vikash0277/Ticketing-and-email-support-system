import winston from "winston";
import fs from "node:fs";
import path from "node:path";

const isTest = process.env.NODE_ENV === "test";
const logDirectory = path.resolve("logs");

if (!isTest) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const transports = [new winston.transports.Console()];

if (!isTest) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
    })
  );
}

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
  transports,
});

export default logger;
