import { Router } from "express";

import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "./notification.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  notificationIdParamsSchema,
  listNotificationsSchema,
} from "./notification.validation.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated notifications }
 */
router.get("/", validate(listNotificationsSchema, "query"), listNotifications);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get the unread notification count
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get("/unread-count", getUnreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: All marked read }
 */
router.post("/read-all", markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notification marked read }
 */
router.post(
  "/:id/read",
  validate(notificationIdParamsSchema, "params"),
  markRead
);

export default router;
