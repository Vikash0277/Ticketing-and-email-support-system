import { Router } from "express";

import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  listCategoriesSchema,
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List ticket categories
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated categories }
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Billing }
 *               description: { type: string }
 *     responses:
 *       201: { description: Category created }
 *       403: { description: Admin only }
 */
router.get("/", validate(listCategoriesSchema, "query"), getCategories);
router.post(
  "/",
  authorize("admin"),
  validate(createCategorySchema),
  createCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category }
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category updated }
 *   delete:
 *     tags: [Categories]
 *     summary: Deactivate a category (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category deactivated }
 */
router.get("/:id", validate(categoryIdParamsSchema, "params"), getCategory);
router.patch(
  "/:id",
  authorize("admin"),
  validate(categoryIdParamsSchema, "params"),
  validate(updateCategorySchema),
  updateCategory
);
router.delete(
  "/:id",
  authorize("admin"),
  validate(categoryIdParamsSchema, "params"),
  deleteCategory
);

export default router;
