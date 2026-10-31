import logger from "../config/logger.js";

function normalizeZodIssues(issues = []) {
  return issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors;

  if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation failed";
    errors = normalizeZodIssues(err.issues);
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Database validation failed";
    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `A record with this ${field} already exists`
      : "A record with this value already exists";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError" ||
    err.name === "NotBeforeError"
  ) {
    statusCode = 401;
    message =
      err.name === "TokenExpiredError"
        ? "Authentication token has expired"
        : "Invalid authentication token";
  } else if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    statusCode = 400;
    message = "Invalid JSON request body";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "Attachment is too large";
  }

  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    statusCode = 500;
    message = "Internal server error";
  }

  const logContext = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorName: err.name,
    message: err.message,
    requestId: req.id,
  };

  if (statusCode >= 500) {
    logger.error("Request failed", { ...logContext, stack: err.stack });
  } else {
    logger.warn("Request rejected", logContext);
  }

  const responseMessage =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : message;

  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV !== "production" &&
      statusCode >= 500 && { stack: err.stack }),
  });
};

export default errorHandler;
