import { z } from "zod";

export const sendOutboundEmailSchema = z.object({
  ticketId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ticket ID"),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(50000),
});