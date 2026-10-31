/**
 * Multipart form fields arrive as strings. This middleware JSON-parses the
 * listed fields so the normal Zod validators can be reused.
 */
export function parseJsonFields(fields = []) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body?.[field];

      if (typeof value !== "string") continue;

      if (value.trim() === "") {
        delete req.body[field];
        continue;
      }

      try {
        req.body[field] = JSON.parse(value);
      } catch {
        // Leave the raw string so Zod reports a helpful validation error.
      }
    }

    next();
  };
}

export default parseJsonFields;
