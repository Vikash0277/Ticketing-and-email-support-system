/**
 * Strips keys that start with "$" or contain "." from user-supplied objects.
 * This blocks MongoDB operator injection without relying on req.query mutation
 * (which is read-only in Express 5).
 */
export function sanitizeMongoInput(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeMongoInput);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const clean = {};

    for (const [key, nested] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeMongoInput(nested);
    }

    return clean;
  }

  return value;
}

export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export default sanitizeMongoInput;
