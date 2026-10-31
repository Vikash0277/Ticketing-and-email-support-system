import ApiError from "../utils/ApiError.js";

/**
 * Validates and replaces req[source] with the parsed value.
 * Usage: validate(schema) or validate(schema, "query" | "params").
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next(ApiError.badRequest("Validation failed", errors));
  }

  const key = `validated${source[0].toUpperCase()}${source.slice(1)}`;
  req[key] = result.data;

  return next();
};

export default validate;
