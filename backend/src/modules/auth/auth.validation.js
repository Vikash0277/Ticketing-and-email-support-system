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

// Registration
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
}).strict();

// Email and password login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
}).strict();

// Verify registration OTP
export const verifyOtpSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  otp: otpSchema,
}).strict().refine(
  (data) => Boolean(data.email) !== Boolean(data.phone),
  {
    message: "Provide either email or phone, but not both",
    path: ["email"],
  }
);

// Request login OTP
export const requestOtpSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).strict().refine(
  (data) => Boolean(data.email) !== Boolean(data.phone),
  {
    message: "Provide either email or phone, but not both",
    path: ["email"],
  }
);

// Verify login OTP
export const verifyLoginOtpSchema = verifyOtpSchema;

// Refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32).max(512),
}).strict();

// Logout
export const logoutSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
}).strict();

// Forgot password
export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

// Reset password
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  password: passwordSchema,
}).strict();

// Resend OTP
export const resendOtpSchema = requestOtpSchema;