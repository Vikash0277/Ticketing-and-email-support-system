import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { attachmentUpload } from "../../middleware/upload.middleware.js";
import { parseJsonFields } from "../../middleware/parse-json-fields.middleware.js";
import { ticketCreateLimiter } from "../../middleware/rate-limit.middleware.js";
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  updateTicketStatus,
  resolveTicket,
  reopenTicket,
  closeTicket,
  assignTicket,
  getTicketStats,
} from "./ticket.controller.js";

import {
  createTicketSchema,
  listTicketsSchema,
  ticketIdParamsSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  statusActionSchema,
  assignTicketSchema,
} from "./ticket.validation.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /tickets:
 *   post:
 *     tags: [Tickets]
 *     summary: Create a ticket
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, description, categoryId]
 *             properties:
 *               subject: { type: string, example: Unable to log in }
 *               description: { type: string, example: I get an error after entering my password }
 *               categoryId: { type: string }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *               tags: { type: array, items: { type: string } }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Ticket created }
 *       400: { description: Validation failed }
 *   get:
 *     tags: [Tickets]
 *     summary: List tickets with filters and pagination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: view
 *         schema: { type: string, enum: [all, mine, unassigned, overdue] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, updatedAt, priority, newest, oldest, updated] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated tickets }
 */
router.post(
  "/",
  ticketCreateLimiter,
  attachmentUpload,
  parseJsonFields(["tags"]),
  validate(createTicketSchema),
  createTicket
);

router.get("/", validate(listTicketsSchema, "query"), listTickets);

/**
 * @openapi
 * /tickets/stats:
 *   get:
 *     tags: [Tickets]
 *     summary: Get ticket counts for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket statistics }
 */
router.get("/stats", getTicketStats);

/**
 * @openapi
 * /tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     summary: Get a ticket with its category, requester and assignee
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ticket }
 *       403: { description: Not allowed }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Tickets]
 *     summary: Update ticket fields
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket updated }
 */
router.get("/:id", validate(ticketIdParamsSchema, "params"), getTicket);

router.patch(
  "/:id",
  validate(ticketIdParamsSchema, "params"),
  validate(updateTicketSchema),
  updateTicket
);

/**
 * @openapi
 * /tickets/{id}/status:
 *   patch:
 *     tags: [Tickets]
 *     summary: Change ticket status using the lifecycle state machine
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid transition }
 */
router.patch(
  "/:id/status",
  validate(ticketIdParamsSchema, "params"),
  validate(updateTicketStatusSchema),
  updateTicketStatus
);

/**
 * @openapi
 * /tickets/{id}/resolve:
 *   post:
 *     tags: [Tickets]
 *     summary: Resolve a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket resolved }
 */
router.post(
  "/:id/resolve",
  validate(ticketIdParamsSchema, "params"),
  validate(statusActionSchema),
  resolveTicket
);

/**
 * @openapi
 * /tickets/{id}/reopen:
 *   post:
 *     tags: [Tickets]
 *     summary: Reopen a resolved or closed ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket reopened }
 */
router.post(
  "/:id/reopen",
  validate(ticketIdParamsSchema, "params"),
  validate(statusActionSchema),
  reopenTicket
);

/**
 * @openapi
 * /tickets/{id}/close:
 *   post:
 *     tags: [Tickets]
 *     summary: Close a ticket
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ticket closed }
 */
router.post(
  "/:id/close",
  validate(ticketIdParamsSchema, "params"),
  validate(statusActionSchema),
  closeTicket
);

/**
 * @openapi
 * /tickets/{id}/assign:
 *   patch:
 *     tags: [Tickets]
 *     summary: Assign or reassign a ticket to an agent
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignedTo]
 *             properties:
 *               assignedTo: { type: string, nullable: true }
 *     responses:
 *       200: { description: Ticket assigned }
 */
router.patch(
  "/:id/assign",
  validate(ticketIdParamsSchema, "params"),
  validate(assignTicketSchema),
  assignTicket
);

export default router;
