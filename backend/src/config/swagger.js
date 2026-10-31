import swaggerJsdoc from "swagger-jsdoc";

const port = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BitMax Ticketing System API",
      version: "2.0.0",
      description:
        "Production-ready ticketing and email support API with JWT/OTP auth, role-based access control, ticket lifecycle management and two-way email threading.",
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${port}/api/v1`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Ticket: {
          type: "object",
          properties: {
            _id: { type: "string" },
            ticketNumber: { type: "string", example: "TKT-2026-000001" },
            subject: { type: "string" },
            description: { type: "string" },
            status: {
              type: "string",
              enum: [
                "open",
                "in_progress",
                "pending",
                "resolved",
                "closed",
                "reopened",
              ],
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
            },
            categoryId: { type: "string" },
            requesterId: { type: "string" },
            requesterEmail: { type: "string" },
            assignedTo: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Authentication", description: "Registration, OTP and sessions" },
      { name: "Tickets", description: "Ticket lifecycle" },
      { name: "Messages", description: "Ticket conversation" },
      { name: "Activity", description: "Ticket audit timeline" },
      { name: "Categories", description: "Ticket categories" },
      { name: "Dashboard", description: "Role-based statistics" },
      { name: "Users", description: "User administration" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Email", description: "Outbound and inbound email" },
      { name: "Health", description: "Service health" },
    ],
  },
  apis: ["./src/modules/**/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
