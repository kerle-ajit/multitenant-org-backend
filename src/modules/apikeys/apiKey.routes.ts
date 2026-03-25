import { Router } from "express";
import { ApiKeyController } from "./apiKey.controller";
import { requireRole } from "../../middleware/roleAuth";
import { idempotencyMiddleware } from "../../middleware/idempotency";

const router = Router();

router.post("/generate", requireRole("OWNER"), ApiKeyController.generateKey);
router.post("/rotate", idempotencyMiddleware,requireRole("OWNER"), ApiKeyController.rotateKey);

export default router;