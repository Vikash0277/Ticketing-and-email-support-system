import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { createTicket, listTickets, getTicket, updateTicket, updateTicketStatus, assignTicket } from "./ticket.controller.js";

import {
  createTicketSchema,
  listTicketsSchema,
  ticketIdParamsSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  assignTicketSchema,
} from "./ticket.validation.js";

const router = Router();

router.use(authenticate);

router.post("/", validate(createTicketSchema), createTicket);

router.get("/", validate(listTicketsSchema, "query"), listTickets);

router.get("/:id", validate(ticketIdParamsSchema, "params"), getTicket);

router.patch("/:id", validate(ticketIdParamsSchema, "params"),validate(updateTicketSchema),updateTicket
);

router.patch("/:id/status", validate(ticketIdParamsSchema, "params"),validate(updateTicketStatusSchema),updateTicketStatus);

router.patch("/:id/assign", validate(ticketIdParamsSchema, "params"),validate(assignTicketSchema),
assignTicket);

export default router;