import "dotenv/config";
import { z } from "zod";

const optionalString = z.string().trim().optional().default("");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().default("http://localhost:3000/api/v1"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: optionalString,

  JWT_ACCESS_SECRET: z.string().min(8, "JWT_ACCESS_SECRET is required"),
  TOKEN_HASH_SECRET: z.string().min(8, "TOKEN_HASH_SECRET is required"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_REPLY_DOMAIN: optionalString,
  EMAIL_REPLY_TOKEN_SECRET: optionalString,
  RESEND_WEBHOOK_SECRET: optionalString,

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_FOLDER: z.string().default("bitmax-tickets"),

  LOG_LEVEL: z.string().default("http"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  email: {
    enabled: Boolean(raw.RESEND_API_KEY),
    replyDomain: raw.EMAIL_REPLY_DOMAIN,
    replyTokenSecret:
      raw.EMAIL_REPLY_TOKEN_SECRET || raw.TOKEN_HASH_SECRET,
    webhookSecret: raw.RESEND_WEBHOOK_SECRET,
  },
  cloudinary: {
    enabled: Boolean(
      raw.CLOUDINARY_CLOUD_NAME &&
        raw.CLOUDINARY_API_KEY &&
        raw.CLOUDINARY_API_SECRET
    ),
    folder: raw.CLOUDINARY_FOLDER,
  },
  queue: {
    enabled: Boolean(raw.REDIS_URL),
  },
};

export default env;
