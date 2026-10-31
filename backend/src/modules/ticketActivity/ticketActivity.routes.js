import { Router } from "express";

import {
  listTicketActivities,
  getTicketActivity,
} from "./ticketActivity.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /tickets/{ticketId}/activities:
 *   get:
 *     tags: [Activity]
 *     summary: List the audit timeline for a ticket
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: Paginated activity timeline }
 */
router.get("/:ticketId/activities", listTicketActivities);
router.get("/:ticketId/activity", listTicketActivities);

/**
 * @openapi
 * /tickets/{ticketId}/activities/{activityId}:
 *   get:
 *     tags: [Activity]
 *     summary: Get a single timeline entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Activity }
 *       404: { description: Not found }
 */
router.get("/:ticketId/activities/:activityId", getTicketActivity);

export default router;
