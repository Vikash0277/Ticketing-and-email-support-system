import { Router } from "express";

import { getSummary } from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Role-aware dashboard summary
 *     description: Returns ticket counts, a 14-day trend series and recent tickets. Admins also receive user totals.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard summary }
 *       401: { description: Authentication required }
 */
router.get("/summary", getSummary);

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Backwards-compatible alias of /dashboard/summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard summary }
 */
// Backwards-compatible alias used by the original frontend.
router.get("/stats", getSummary);

export default router;
