
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Ticketing System API",
      version: "1.0.0",
      description:
        "API documentation for the customer support and ticket management system.",
    },

    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:5000/api/v1",
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
    },
  },

  apis: ["./src/modules/**/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc({
  ...options,
  failOnErrors: true,
});

export default swaggerSpec;
