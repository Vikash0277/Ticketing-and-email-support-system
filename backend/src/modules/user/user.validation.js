import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const emailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email")
  .transform((value) => value.toLowerCase());

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +919876543210");

const passwordSchema = z.string().min(8).max(72);

const roleSchema = z.enum(["customer", "agent", "admin"]);

const booleanFromQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1")
  .optional();

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  isActive: booleanFromQuery,
});

export const userIdParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid user ID"),
});

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: passwordSchema,
    phone: z.union([phoneSchema, z.literal(""), z.null()]).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    role: roleSchema.optional().default("customer"),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: emailSchema.optional(),
    phone: z.union([phoneSchema, z.literal(""), z.null()]).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    avatarUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: roleSchema,
  })
  .strict();
