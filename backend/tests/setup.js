import { existsSync } from "node:fs";

import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Environment must be configured before any application module is imported.
// ---------------------------------------------------------------------------
process.env.NODE_ENV = "test";
process.env.PORT = "3101";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/bitmax_test_placeholder";
process.env.JWT_ACCESS_SECRET = "test-access-secret-please-change-1234567890";
process.env.TOKEN_HASH_SECRET = "test-token-hash-secret-please-change-1234567890";
process.env.EMAIL_REPLY_TOKEN_SECRET = "test-reply-token-secret-please-change-1234567890";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = "7";
process.env.RESEND_API_KEY = "";
process.env.EMAIL_FROM = "";
process.env.EMAIL_REPLY_DOMAIN = "";
process.env.RESEND_WEBHOOK_SECRET = "";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
process.env.LOG_LEVEL = "error";
process.env.FRONTEND_URL = "http://localhost:5173";

const SYSTEM_BINARY_CANDIDATES = [
  process.env.MONGOMS_SYSTEM_BINARY,
  "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
  "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  "/usr/bin/mongod",
  "/usr/local/bin/mongod",
].filter(Boolean);

const systemBinary = SYSTEM_BINARY_CANDIDATES.find((candidate) =>
  existsSync(candidate)
);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create(
    systemBinary ? { binary: { systemBinary } } : undefined
  );

  await mongoose.connect(mongod.getUri(), { dbName: "bitmax_test" });

  const { default: User } = await import("../src/modules/user/user.model.js");
  const { default: Category } = await import(
    "../src/modules/categories/category.model.js"
  );

  const passwordHash = await bcrypt.hash("Password123!", 4);

  const [admin, agent, customer] = await User.create([
    {
      name: "Test Admin",
      email: "admin@bitmax.test",
      role: "admin",
      passwordHash,
      isEmailVerified: true,
      jobTitle: "Support Manager",
    },
    {
      name: "Test Agent",
      email: "agent@bitmax.test",
      role: "agent",
      passwordHash,
      isEmailVerified: true,
      jobTitle: "Support Engineer",
    },
    {
      name: "Test Customer",
      email: "customer@bitmax.test",
      role: "customer",
      passwordHash,
      isEmailVerified: true,
    },
  ]);

  await Category.create([
    {
      name: "Technical",
      description: "Technical issues",
      createdBy: admin._id,
    },
    {
      name: "Billing",
      description: "Billing questions",
      createdBy: admin._id,
    },
    {
      name: "Account",
      description: "Account access",
      createdBy: admin._id,
    },
  ]);

  // Keep references alive so linting/coverage tools do not flag unused seeds.
  void agent;
  void customer;
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongod) {
    await mongod.stop();
  }
});
