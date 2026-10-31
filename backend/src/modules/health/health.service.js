import mongoose from "mongoose";
import os from "node:os";

export function getLiveness() {
  return {
    status: "ok",
    service: "ticketing-api",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  };
}

export function getReadiness() {
  const dbState = mongoose.connection.readyState;

  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const database = databaseStates[dbState] ?? "unknown";
  const ready = dbState === 1;

  return {
    status: ready ? "ok" : "unavailable",
    service: "ticketing-api",
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: database,
      },
    },
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
    },
  };
}