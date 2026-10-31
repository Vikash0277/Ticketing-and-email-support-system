import { Webhook } from "svix";

import env from "../config/env.js";
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";

/**
 * Verifies Resend's Svix webhook signature. Resend signs the raw request body,
 * so app.js keeps a copy in req.rawBody.
 */
export function verifyResendWebhook(req, res, next) {
  const secret = env.email.webhookSecret;

  if (!secret) {
    if (env.isProduction) {
      return next(
        new ApiError(503, "Inbound email webhook is not configured")
      );
    }

    logger.warn(
      "RESEND_WEBHOOK_SECRET is missing. Skipping webhook signature check in development."
    );

    return next();
  }

  const id = req.headers["svix-id"];
  const timestamp = req.headers["svix-timestamp"];
  const signature = req.headers["svix-signature"];

  if (!id || !timestamp || !signature) {
    return next(ApiError.unauthorized("Missing webhook signature headers"));
  }

  const payload = req.rawBody
    ? req.rawBody.toString("utf8")
    : JSON.stringify(req.body ?? {});

  try {
    const webhook = new Webhook(secret);

    req.webhookPayload = webhook.verify(payload, {
      "svix-id": String(id),
      "svix-timestamp": String(timestamp),
      "svix-signature": String(signature),
    });

    return next();
  } catch (error) {
    logger.warn("Invalid Resend webhook signature", {
      message: error.message,
    });

    return next(ApiError.unauthorized("Invalid webhook signature"));
  }
}

export default verifyResendWebhook;
