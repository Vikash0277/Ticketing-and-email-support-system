import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const ticketActivityParamsSchema = z.object({
  ticketId: z
    .string()
    .regex(objectIdRegex, "Invalid ticket ID"),
});

export const activityIdParamsSchema = z.object({
  ticketId: z
    .string()
    .regex(objectIdRegex, "Invalid ticket ID"),

  activityId: z
    .string()
    .regex(objectIdRegex, "Invalid activity ID"),
});

export const listTicketActivitiesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});