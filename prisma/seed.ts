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

async function main() {
  // Reset data in a relation-safe order.
  await prisma.emailLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const baseTime = new Date(Date.now() - 1000 * 60 * 60);

  for (const tenant of tenants) {
    await prisma.tenant.create({
      data: {
        id: tenant.id,
        name: tenant.name,
        ownerEmail: tenant.ownerEmail,
      },
    });

    for (const user of tenant.users) {
      await prisma.user.create({
        data: {
          id: user.id,
          tenantId: tenant.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    const keyHash = await bcrypt.hash(tenant.rawApiKey, 12);
    await prisma.apiKey.create({
      data: {
        id: `${tenant.id}-key-1`,
        tenantId: tenant.id,
        keyHash,
      },
    });

    let prevHash: string | null = null;
    for (let i = 1; i <= 10; i += 1) {
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
          id: `${tenant.id}-audit-${i}`,
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
