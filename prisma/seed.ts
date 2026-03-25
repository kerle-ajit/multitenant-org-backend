import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

type SeedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type SeedTenant = {
  id: string;
  name: string;
  ownerEmail: string;
  users: SeedUser[];
  rawApiKey: string;
};

const tenants: SeedTenant[] = [
  {
    id: "tenant-alpha",
    name: "Tenant Alpha",
    ownerEmail: "owner.alpha@test.com",
    rawApiKey: "alpha_raw_key_1234567890",
    users: [
      { id: "alpha-owner-1", email: "owner.alpha@test.com", name: "Alpha Owner", role: "OWNER" },
      { id: "alpha-member-1", email: "member1.alpha@test.com", name: "Alpha Member 1", role: "MEMBER" },
      { id: "alpha-member-2", email: "member2.alpha@test.com", name: "Alpha Member 2", role: "MEMBER" },
    ],
  },
  {
    id: "tenant-beta",
    name: "Tenant Beta",
    ownerEmail: "owner.beta@test.com",
    rawApiKey: "beta_raw_key_1234567890",
    users: [
      { id: "beta-owner-1", email: "owner.beta@test.com", name: "Beta Owner", role: "OWNER" },
      { id: "beta-member-1", email: "member1.beta@test.com", name: "Beta Member 1", role: "MEMBER" },
      { id: "beta-member-2", email: "member2.beta@test.com", name: "Beta Member 2", role: "MEMBER" },
    ],
  },
];

function sha256(data: string) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function buildAuditRaw({
  prevHash,
  tenantId,
  actorUserId,
  action,
  ipAddress,
  userAgent,
  timestampMs,
}: {
  prevHash: string | null;
  tenantId: string;
  actorUserId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestampMs: number;
}) {
  // Must match `src/modules/audit/audit.service.ts` verifier JSON shape.
  return JSON.stringify({
    prevHash,
    tenantId,
    actorUserId,
    action,
    ipAddress,
    userAgent,
    timestamp: timestampMs,
  });
}

async function assertValidAuditChain(tenantId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { timestamp: "asc" },
  });

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const prevHash = i > 0 ? entries[i - 1].hash : null;
    const timestampMs = new Date(entry.timestamp).getTime();

    const raw = buildAuditRaw({
      prevHash,
      tenantId: entry.tenantId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestampMs,
    });

    const recalculated = sha256(raw);
    if (entry.prevHash !== prevHash || entry.hash !== recalculated) {
      throw new Error(
        `Audit chain is already invalid for tenantId=${tenantId}. Broken at entry=${entry.id}. Reset DB volume and re-run seed.`,
      );
    }
  }
}

async function main() {
  // NOTE: AuditLog is append-only due to a DB trigger.
  // So we never delete AuditLog rows. Instead, we append more chained entries.
  // We also avoid deleting tenants/users/api keys to prevent FK conflicts.

  const baseTime = new Date(Date.now() - 1000 * 60 * 60);

  for (const tenant of tenants) {
    await prisma.tenant.upsert({
      where: { id: tenant.id },
      update: { name: tenant.name, ownerEmail: tenant.ownerEmail },
      create: { id: tenant.id, name: tenant.name, ownerEmail: tenant.ownerEmail },
    });

    for (const user of tenant.users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: { tenantId: tenant.id, name: user.name, role: user.role },
        create: {
          id: user.id,
          tenantId: tenant.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    const keyHash = await bcrypt.hash(tenant.rawApiKey, 12);
    await prisma.apiKey.upsert({
      where: { id: `${tenant.id}-key-1` },
      update: { keyHash, tenantId: tenant.id },
      create: { id: `${tenant.id}-key-1`, tenantId: tenant.id, keyHash },
    });

    // EmailLog is not append-only in this implementation, so we can reset it.
    await prisma.emailLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.emailLog.createMany({
      data: [
        {
          id: `${tenant.id}-email-1`,
          tenantId: tenant.id,
          recipient: tenant.ownerEmail,
          template: "userInvite",
          status: "SENT",
          attempts: 1,
        },
        {
          id: `${tenant.id}-email-2`,
          tenantId: tenant.id,
          recipient: tenant.ownerEmail,
          template: "apiKeyRotated",
          status: "FAILED",
          attempts: 3,
          error: "SMTP connection timeout",
        },
      ],
    });

    // Append audit chain entries if we don't have enough already.
    const existingCount = await prisma.auditLog.count({ where: { tenantId: tenant.id } });
    const targetCount = 10;
    if (existingCount < targetCount) {
      const lastLog = await prisma.auditLog.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { timestamp: "desc" },
      });

      let prevHash: string | null = lastLog?.hash ?? null;
      const startIndex = existingCount + 1;

      for (let i = startIndex; i <= targetCount; i += 1) {
        const eventTime = new Date(baseTime.getTime() + i * 60_000);
        const actorUserId = tenant.users[0].id;
        const action = `SEED_ACTION_${i}`;
        const ipAddress = "127.0.0.1";
        const userAgent = "seed-script";

        const raw = JSON.stringify({
          prevHash,
          tenantId: tenant.id,
          actorUserId,
          action,
          ipAddress,
          userAgent,
          timestamp: eventTime.getTime(),
        });

        const hash = sha256(raw);
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId,
            action,
            timestamp: eventTime,
            ipAddress,
            userAgent,
            prevHash,
            hash,
          },
        });

        prevHash = hash;
      }
    }

    // Final guardrail: verify the chained hashes are consistent.
    // Since AuditLog is append-only, if this fails we must reset the DB volume.
    await assertValidAuditChain(tenant.id);
  }

  console.log("\nSeed complete. Use these test headers:\n");
  for (const tenant of tenants) {
    const owner = tenant.users.find((u) => u.role === "OWNER");
    console.log(`Tenant: ${tenant.name}`);
    console.log(`  x-api-key: ${tenant.rawApiKey}`);
    console.log(`  x-user-id: ${owner?.id}`);
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
