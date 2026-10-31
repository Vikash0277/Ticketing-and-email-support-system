import { Router } from "express";

import {
  listTicketActivities,
  getTicketActivity,
} from "./ticketActivity.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/:ticketId/activities",
  listTicketActivities
);

router.get(
  "/:ticketId/activities/:activityId",
  getTicketActivity
);

export default router;