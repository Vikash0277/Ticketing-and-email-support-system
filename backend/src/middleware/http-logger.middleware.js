import morgan from "morgan";

import logger from "../config/logger.js";

const stream = {
  write: (message) => logger.http(message.trim()),
};

const skip = (req) =>
  req.originalUrl === "/api/health" ||
  req.originalUrl === "/api/v1/health" ||
  req.originalUrl === "/api/health/ready" ||
  req.originalUrl === "/api/v1/health/ready";

const httpLogger = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms - :req[x-request-id]',
  { stream, skip }
);

export default httpLogger;
