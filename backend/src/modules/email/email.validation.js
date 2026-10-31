import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const sendOutboundEmailSchema = z
  .object({
    ticketId: z.string().regex(objectIdRegex, "Invalid ticket ID"),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(50000),
  })
  .strict();

export const simulateInboundSchema = z
  .object({
    ticketId: z.string().regex(objectIdRegex, "Invalid ticket ID"),
    from: z.string().trim().email().optional(),
    subject: z.string().trim().max(200).optional(),
    text: z.string().trim().min(1).max(50000),
    messageId: z.string().trim().max(500).optional(),
  })
  .strict();

export const emailEventsQuerySchema = z.object({
  ticketId: z.string().regex(objectIdRegex, "Invalid ticket ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
