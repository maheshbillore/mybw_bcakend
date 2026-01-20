import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bharat worker APIs",
      version: "1.0.0",
      description: "REST API documentation for My App (Node.js + TypeScript)",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Local Development Server",
      },
      {
        url: "https://api.bharatworker.com/api",
        description: "Live Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",         // Required
          scheme: "bearer",     // Required
          bearerFormat: "JWT",  // Optional - for display
        },
      },
    },
    security: [
      {
        bearerAuth: [],         // 👈 This enables global auth lock
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Path to your API docs
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: any) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("✅ Swagger docs available at: http://localhost:3000/api-docs");
}
