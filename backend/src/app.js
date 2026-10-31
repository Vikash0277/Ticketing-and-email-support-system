
import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import httpLogger from "./middleware/http-logger.middleware.js";
import logger from "./config/logger.js";
import swaggerSpec from "./config/swagger.js";
import healthRoutes from "./modules/health/health.routes.js";
import ticketsRoutes from "./modules/tickets/ticket.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import ticketMessageRoutes from "./modules/ticketMessage/ticketMessage.routes.js";
import ticketActivityRoutes from "./modules/ticketActivity/ticketActivity.routes.js";
import emailRoutes from "./modules/email/email.routes.js";

const app = express();

// Global middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(httpLogger);
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/tickets", ticketsRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/ticket-messages", ticketMessageRoutes);
app.use("/api/v1/ticket-activities", ticketActivityRoutes);
app.use("/api/v1/email", emailRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler — must be last
app.use(errorHandler);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler (must come last)
app.use(errorHandler);

export default app;
