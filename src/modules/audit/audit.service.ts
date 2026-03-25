import { prisma } from "../../config/db";
import { computeAuditHash } from "./helpers/hash";

interface AuditLogData {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  ipAddress: string | undefined ;
  userAgent: string | undefined;
}


export const AuditService = {

  async log({ tenantId, actorUserId, action, ipAddress, userAgent } : AuditLogData) {

    // Get last audit log for hash chaining
    const lastLog = await prisma.auditLog.findFirst({
      where: { tenantId },
      orderBy: { timestamp: "desc" }
    });

    const prevHash = lastLog?.hash || null;

    // Build string to hash
    const raw = JSON.stringify({
      prevHash,
      tenantId,
      actorUserId,
      action,
      ipAddress,
      userAgent,
      timestamp: Date.now()
    });

    const newHash = computeAuditHash(raw);

    // Insert audit log
    return prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        ipAddress,
        userAgent,
        prevHash,
        hash: newHash
      }
    });
  }
  ,
  async verifyChain(tenantId: string) {
    const entries = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: "asc" },
    });

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const prevHash = i > 0 ? entries[i - 1].hash : null;
      const raw = JSON.stringify({
        prevHash,
        tenantId: entry.tenantId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date(entry.timestamp).getTime(),
      });

      const recalculated = computeAuditHash(raw);
      if (entry.prevHash !== prevHash || entry.hash !== recalculated) {
        return { valid: false, brokenEntryId: entry.id };
      }
    }

    return { valid: true, brokenEntryId: null };
  },

  async listByTenant(tenantId: string, cursor?: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { tenantId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { timestamp: "desc" },
    });
  },

};