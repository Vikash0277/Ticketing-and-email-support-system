import { Router } from "express";

import {
  createTicketMessage,
  listTicketMessages,
  getTicketMessage,
} from "./ticketMessage.controller.js";

import { validate } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
 createTicketMessageSchema,
} from "./ticketMessage.validation.js";

const router = Router();

router.use(authenticate);

router.post("/:ticketId/messages", validate(createTicketMessageSchema), createTicketMessage);

router.get("/:ticketId/messages", listTicketMessages);

router.get("/:ticketId/messages/:messageId", getTicketMessage);

export default router;