import { Router } from "express";

import {
  listUsers,
  listAgents,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getUserStats,
} from "./user.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  listUsersSchema,
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
} from "./user.validation.js";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users (staff; full directory for admins)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated users }
 *   post:
 *     tags: [Users]
 *     summary: Create a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: User created }
 */
router.get("/", validate(listUsersSchema, "query"), listUsers);
router.post(
  "/",
  authorize("admin"),
  validate(createUserSchema),
  createUser
);

/**
 * @openapi
 * /users/agents:
 *   get:
 *     tags: [Users]
 *     summary: List active agents and admins for ticket assignment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Agent list }
 */
router.get("/agents", authorize("agent", "admin"), listAgents);

/**
 * @openapi
 * /users/stats:
 *   get:
 *     tags: [Users]
 *     summary: User totals (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User statistics }
 */
router.get("/stats", authorize("admin"), getUserStats);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User }
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User updated }
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User deactivated }
 */
router.get("/:id", authorize("agent", "admin"), validate(userIdParamsSchema, "params"), getUser);
router.patch(
  "/:id",
  authorize("admin"),
  validate(userIdParamsSchema, "params"),
  validate(updateUserSchema),
  updateUser
);
router.delete(
  "/:id",
  authorize("admin"),
  validate(userIdParamsSchema, "params"),
  deleteUser
);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch(
  "/:id/status",
  authorize("admin"),
  validate(userIdParamsSchema, "params"),
  validate(updateUserStatusSchema),
  updateUserStatus
);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's role (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role updated }
 */
router.patch(
  "/:id/role",
  authorize("admin"),
  validate(userIdParamsSchema, "params"),
  validate(updateUserRoleSchema),
  updateUserRole
);

export default router;
