import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email")
  .transform((value) => value.toLowerCase());

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +919876543210");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must not exceed 72 characters");

const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "OTP must contain exactly 6 digits");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(72),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    otp: otpSchema,
  })
  .strict()
  .refine((data) => Boolean(data.email) !== Boolean(data.phone), {
    message: "Provide either email or phone, but not both",
    path: ["email"],
  });

export const requestOtpSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.email) !== Boolean(data.phone), {
    message: "Provide either email or phone, but not both",
    path: ["email"],
  });

export const verifyLoginOtpSchema = verifyOtpSchema;

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(32).max(512),
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(32).max(512).optional(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(512),
    password: passwordSchema,
  })
  .strict();

export const resendOtpSchema = requestOtpSchema;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.union([phoneSchema, z.literal(""), z.null()]).optional(),
    avatarUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
    jobTitle: z.string().trim().max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    password: passwordSchema,
  })
  .strict();

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
});
