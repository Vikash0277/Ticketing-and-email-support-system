import { Router } from "express";

import {
  createTicketMessage,
  listTicketMessages,
  getTicketMessage,
  downloadMessageAttachment,
} from "./ticketMessage.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { attachmentUpload } from "../../middleware/upload.middleware.js";
import {
  ticketMessageParamsSchema,
  messageIdParamsSchema,
  attachmentParamsSchema,
  createTicketMessageSchema,
  listTicketMessagesSchema,
} from "./ticketMessage.validation.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /tickets/{ticketId}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Add a public reply or internal note to a ticket
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string }
 *               type: { type: string, enum: [public, internal] }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               body: { type: string }
 *               type: { type: string, enum: [public, internal] }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Message added }
 *       403: { description: Not allowed }
 *   get:
 *     tags: [Messages]
 *     summary: List the ticket conversation
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
 *       200: { description: Paginated messages }
 */
router.post(
  "/:ticketId/messages",
  attachmentUpload,
  validate(ticketMessageParamsSchema, "params"),
  validate(createTicketMessageSchema),
  createTicketMessage
);

router.get(
  "/:ticketId/messages",
  validate(ticketMessageParamsSchema, "params"),
  validate(listTicketMessagesSchema, "query"),
  listTicketMessages
);

/**
 * @openapi
 * /tickets/{ticketId}/messages/{messageId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get a single message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Message }
 *       404: { description: Not found }
 */
router.get(
  "/:ticketId/messages/:messageId",
  validate(messageIdParamsSchema, "params"),
  getTicketMessage
);

/**
 * @openapi
 * /tickets/{ticketId}/messages/{messageId}/attachments/{attachmentId}:
 *   get:
 *     tags: [Messages]
 *     summary: Download a message attachment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: File stream or redirect to CDN }
 *       404: { description: Not found }
 */
router.get(
  "/:ticketId/messages/:messageId/attachments/:attachmentId",
  validate(attachmentParamsSchema, "params"),
  downloadMessageAttachment
);

export default router;
