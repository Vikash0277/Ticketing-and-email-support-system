
import morgan from "morgan";
import logger from "../config/logger.js";

const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

const skip = (req, res) => {
  // Avoid logging routine health checks.
  return req.originalUrl === "/api/health";
};

const httpLogger = morgan("combined", {
  stream,
  skip,
});

export default httpLogger;
