import crypto from "node:crypto";

import sanitizeMongoInput from "../utils/sanitize.js";

export function requestId(req, res, next) {
  const id = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}

/**
 * Sanitizes body and params. Query is intentionally skipped because Express 5
 * exposes it as a read-only getter; query values are validated by Zod instead.
 */
export function mongoSanitizer(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeMongoInput(req.body);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeMongoInput(req.params);
  }

  next();
}

export default requestId;
