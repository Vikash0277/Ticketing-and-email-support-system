import { Router } from "express";

import { downloadLocalAttachment } from "./attachment.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/local/:key", authenticate, downloadLocalAttachment);

export default router;
