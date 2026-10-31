import { Router } from "express";

import {
  inboundWebhook,
  simulateInbound,
  sendOutbound,
  listEmailEvents,
} from "./email.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyResendWebhook } from "../../middleware/email.webhook.middleware.js";
import {
  sendOutboundEmailSchema,
  simulateInboundSchema,
  emailEventsQuerySchema,
} from "./email.validation.js";

const router = Router();

/**
 * @openapi
 * /email/inbound:
 *   post:
 *     tags: [Email]
 *     summary: Resend inbound email webhook
 *     description: Verified using the Svix signature headers. Resend must call this endpoint on `email.received`.
 *     responses:
 *       200: { description: Webhook processed }
 *       401: { description: Invalid signature }
 */
router.post("/inbound", verifyResendWebhook, inboundWebhook);

/**
 * @openapi
 * /email/inbound/simulate:
 *   post:
 *     tags: [Email]
 *     summary: Simulate an inbound customer email (development only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Simulated email processed }
 *       403: { description: Disabled in production }
 */
router.post(
  "/inbound/simulate",
  authenticate,
  authorize("agent", "admin"),
  validate(simulateInboundSchema),
  simulateInbound
);

/**
 * @openapi
 * /email/outbound:
 *   post:
 *     tags: [Email]
 *     summary: Send a staff email about a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Email queued }
 */
router.post(
  "/outbound",
  authenticate,
  authorize("agent", "admin"),
  validate(sendOutboundEmailSchema),
  sendOutbound
);

/**
 * @openapi
 * /email/events:
 *   get:
 *     tags: [Email]
 *     summary: List inbound/outbound email events
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Email events }
 */
router.get(
  "/events",
  authenticate,
  authorize("agent", "admin"),
  validate(emailEventsQuerySchema, "query"),
  listEmailEvents
);

export default router;
