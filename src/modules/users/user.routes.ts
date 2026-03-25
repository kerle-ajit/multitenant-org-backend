import { Router } from "express";
import { UserController } from "./user.controller";
import { requireRole } from "../../middleware/roleAuth";
import { rateLimiter } from "../../middleware/rateLimiter";
import { idempotencyMiddleware } from "../../middleware/idempotency";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.post("/", idempotencyMiddleware,rateLimiter({ endpoint: "createUser", limit: 60 }), requireRole("OWNER"), 
asyncHandler(UserController.createUser));

export default router;