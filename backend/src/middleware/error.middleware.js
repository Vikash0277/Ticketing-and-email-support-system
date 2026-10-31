
import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  // Delegate if the response has already started.
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let errors;

  // Zod validation errors
  if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation failed";

    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  // Mongoose validation errors
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Database validation failed";

    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // MongoDB duplicate key errors
  else if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue || {})[0];

    message = field
      ? `${field} already exists`
      : "A record with this value already exists";
  }

  // Invalid MongoDB ObjectId
  else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  // Invalid or expired JWT
  else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError" ||
    err.name === "NotBeforeError"
  ) {
    statusCode = 401;
    message =
      err.name === "TokenExpiredError"
        ? "Authentication token has expired"
        : "Invalid authentication token";
  }

  // Malformed JSON request body
  else if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    statusCode = 400;
    message = "Invalid JSON request body";
  }

  // Ensure valid HTTP status code
  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    statusCode = 500;
    message = "Internal server error";
  }

  // Log using Winston
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorName: err.name,
    message: err.message,
    requestId: req.id,
  };

  if (statusCode >= 500) {
    logger.error("Request failed", {
      ...logContext,
      stack: err.stack,
    });
  } else {
    logger.warn("Request rejected", logContext);
  }

  // Never expose internal errors in production.
  const responseMessage =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : message;

  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" &&
      statusCode >= 500 && {
        stack: err.stack,
      }),
  });
};
