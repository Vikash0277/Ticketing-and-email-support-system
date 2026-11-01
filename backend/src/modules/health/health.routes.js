import { Router } from "express";
import {
  liveness,
  readiness,
} from "./health.controller.js";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Returns 200 while the API process is running.
 *     responses:
 *       200: { description: Service is alive }
 */
router.get("/", liveness);

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Checks the MongoDB connection before reporting ready.
 *     responses:
 *       200: { description: Service is ready }
 *       503: { description: A dependency is unavailable }
 */
router.get("/ready", readiness);

export default router;
