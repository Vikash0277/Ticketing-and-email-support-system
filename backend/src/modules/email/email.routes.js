import { Router } from "express";
import {
  inboundEmail,
  outboundEmail,
} from "./email.controller.js";
import { sendOutboundEmailSchema } from "./email.validation.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router();

// IMPORTANT:
// Apply your email provider's signature-verification middleware
// before inboundEmail. Do not expose an unverified webhook.
router.post("/inbound", inboundEmail);

// IMPORTANT:
// Apply your existing authentication and staff-role middleware
// before validate() on this route.
router.post(
  "/outbound",
  validate(sendOutboundEmailSchema),
  outboundEmail
);

export default router;