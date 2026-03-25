import { Router } from "express";
import { Request, Response } from "express";
import { AuditService } from "./audit.service";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenant.id;
    const result = await AuditService.verifyChain(tenantId);
    res.json(result);
  }),
);

router.get(
  "/logs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenant.id;
    const cursor = req.query.cursor as string | undefined;
    const logs = await AuditService.listByTenant(tenantId, cursor);
    const nextCursor = logs.length ? logs[logs.length - 1].id : null;
    res.json({ data: logs, nextCursor });
  }),
);

export default router;
