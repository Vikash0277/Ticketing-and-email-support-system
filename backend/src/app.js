import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import "./config/env.js";
import env from "./config/env.js";
import swaggerSpec from "./config/swagger.js";
import httpLogger from "./middleware/http-logger.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import {
  mongoSanitizer,
  requestId,
} from "./middleware/security.middleware.js";
import { apiLimiter } from "./middleware/rate-limit.middleware.js";

import authRoutes from "./modules/auth/auth.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import ticketRoutes from "./modules/tickets/ticket.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import ticketMessageRoutes from "./modules/ticketMessage/ticketMessage.routes.js";
import ticketActivityRoutes from "./modules/ticketActivity/ticketActivity.routes.js";
import emailRoutes from "./modules/email/email.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import attachmentRoutes from "./modules/attachments/attachment.routes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = new Set(
  [
    env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:4173",
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (env.isDevelopment) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "svix-id",
      "svix-timestamp",
      "svix-signature",
    ],
    exposedHeaders: ["X-Request-Id"],
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buffer) => {
      // Preserve the raw payload so webhook signatures can be verified.
      req.rawBody = buffer;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(requestId);
app.use(mongoSanitizer);
app.use(httpLogger);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BitMax Ticketing API",
    docs: "/api-docs",
    health: "/api/health",
  });
});

// Swagger documentation (both paths for convenience).
const swaggerHandler = [
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { customSiteTitle: "BitMax Ticketing API" }),
];
app.use("/api-docs", ...swaggerHandler);
app.use("/api/docs", ...swaggerHandler);

const apiRouters = [
  ["/auth", authRoutes],
  ["/health", healthRoutes],
  ["/tickets", ticketRoutes],
  ["/tickets", ticketMessageRoutes],
  ["/tickets", ticketActivityRoutes],
  ["/categories", categoryRoutes],
  ["/dashboard", dashboardRoutes],
  ["/users", userRoutes],
  ["/notifications", notificationRoutes],
  ["/attachments", attachmentRoutes],
  ["/email", emailRoutes],
];

// Primary versioned API plus an unversioned alias so both the assignment's
// endpoint list and the frontend client keep working.
for (const [prefix, router] of apiRouters) {
  app.use(`/api/v1${prefix}`, apiLimiter, router);
  app.use(`/api${prefix}`, apiLimiter, router);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
