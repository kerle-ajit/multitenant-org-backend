import { Router } from "express";
import { Request, Response } from "express";
import { prisma } from "../../config/db";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get(
  "/logs",
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenant.id;
    const logs = await prisma.emailLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: logs });
  }),
);

export default router;
