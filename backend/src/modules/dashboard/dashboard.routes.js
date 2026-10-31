import { Router } from "express";
import { getSummary } from "./dashboard.controller.js";

// Replace this import with the actual authentication middleware
// used by your existing project.
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/summary", authenticate, getSummary);

export default router;