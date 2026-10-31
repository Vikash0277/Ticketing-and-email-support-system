import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const ticketIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid ticket ID");

const categoryIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid category ID");

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

const statusSchema = z.enum([
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "reopened",
]);

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Subject must contain at least 3 characters")
    .max(200, "Subject cannot exceed 200 characters"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(50000, "Description cannot exceed 50000 characters"),

  categoryId: categoryIdSchema,

  priority: prioritySchema.optional().default("medium"),

  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(10, "Maximum 10 tags are allowed")
    .optional()
    .default([]),
});

export const listTicketsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  categoryId: categoryIdSchema.optional(),
  assignedTo: z.string().regex(objectIdRegex, "Invalid assignee ID").optional(),
  requesterId: z.string().regex(objectIdRegex, "Invalid requester ID").optional(),

  search: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(500).optional(),

  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),

  view: z.enum(["all", "mine", "unassigned", "overdue"]).default("all"),

  sortBy: z
    .enum(["createdAt", "updatedAt", "priority", "newest", "oldest", "updated"])
    .default("updatedAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const ticketIdParamsSchema = z.object({
  id: ticketIdSchema,
});

export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(1).max(50000).optional(),
    categoryId: categoryIdSchema.optional(),
    priority: prioritySchema.optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const updateTicketStatusSchema = z.object({
  status: statusSchema,
  note: z.string().trim().max(2000).optional(),
});

export const statusActionSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

export const assignTicketSchema = z.object({
  assignedTo: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID")
    .nullable(),
});
