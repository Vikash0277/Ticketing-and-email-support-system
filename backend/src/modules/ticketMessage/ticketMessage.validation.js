import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const ticketMessageParamsSchema = z.object({
  ticketId: z
    .string()
    .regex(objectIdRegex, "Invalid ticket ID"),
});

export const messageIdParamsSchema = z.object({
  ticketId: z
    .string()
    .regex(objectIdRegex, "Invalid ticket ID"),

  messageId: z
    .string()
    .regex(objectIdRegex, "Invalid message ID"),
});

export const createTicketMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message body is required")
    .max(50000, "Message cannot exceed 50000 characters"),

  type: z
    .enum(["public", "internal"])
    .optional()
    .default("public"),
});

export const listTicketMessagesSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("asc"),
});