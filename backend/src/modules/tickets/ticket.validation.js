import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const ticketIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid ticket ID");

const categoryIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid category ID");

const prioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

const statusSchema = z.enum([
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "reopened",
]);

// POST /api/v1/tickets
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

// GET /api/v1/tickets
export const listTicketsSchema = z.object({
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

  status: statusSchema.optional(),

  priority: prioritySchema.optional(),

  categoryId: categoryIdSchema.optional(),

  sortBy: z
    .enum(["createdAt", "updatedAt", "priority"])
    .optional()
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc"),
});

// GET /api/v1/tickets/:id
export const ticketIdParamsSchema = z.object({
  id: ticketIdSchema,
});

// PATCH /api/v1/tickets/:id
export const updateTicketSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .optional(),

    description: z
      .string()
      .trim()
      .min(1)
      .max(50000)
      .optional(),

    categoryId: categoryIdSchema.optional(),

    priority: prioritySchema.optional(),

    tags: z
      .array(z.string().trim().min(1).max(50))
      .max(10)
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  );

// PATCH /api/v1/tickets/:id/status
export const updateTicketStatusSchema = z.object({
  status: statusSchema,

  note: z
    .string()
    .trim()
    .max(2000)
    .optional(),
});

// PATCH /api/v1/tickets/:id/assign
export const assignTicketSchema = z.object({
  assignedTo: z
    .string()
    .regex(objectIdRegex, "Invalid assignee ID")
    .nullable(),
});