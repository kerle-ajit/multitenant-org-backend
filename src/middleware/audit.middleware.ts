import { Request, Response, NextFunction } from "express";
import { AuditService } from "../modules/audit/audit.service";


export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  // Capture data after response finishes
  res.on("finish", async () => {

    if (!req.action) return; // Only log if controller sets action
    console.log(req.tenant.id)
    console.log(req.action)
    try {
      await AuditService.log({
        tenantId: req.tenant.id,
        actorUserId: req.user?.id || null,
        action: req.action,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      } );

      console.log("Audit log added:", req.action);
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  });

  next();
}