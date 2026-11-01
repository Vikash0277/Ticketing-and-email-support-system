import { Router } from "express";

import { downloadLocalAttachment } from "./attachment.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /attachments/local/{key}:
 *   get:
 *     tags: [Attachments]
 *     summary: Download a locally stored attachment
 *     description: Used when Cloudinary is not configured. Requires a bearer token.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: File stream }
 *       401: { description: Authentication required }
 *       404: { description: Attachment not found }
 */
router.get("/local/:key", authenticate, downloadLocalAttachment);

export default router;
