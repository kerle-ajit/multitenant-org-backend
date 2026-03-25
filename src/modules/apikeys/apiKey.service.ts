import { prisma } from "../../config/db";
import { generateApiKey, hashKey } from "../../utils/crypto";
import apiKeyRotatedTemplate from "../email/templates/apiKeyRotated";
import { EmailService } from "../email/email.service";

export const ApiKeyService = {

  async generateKey(tenantId: string) {
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        keyHash
      }
    });

    return { rawKey, apiKey };
  },


  async rotateKey(tenantId: string, oldKeyId: string) {
    // 1. Fetch tenant details (needed for email trigger)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // 2. Generate new raw key + hash
    const rawKey = generateApiKey();
    const newHash = await hashKey(rawKey);

    // 3. Email notification BEFORE creating new key (as per PDF requirement)
    if (tenant.ownerEmail) {
      await EmailService.enqueueEmail(
        tenantId,
        tenant.ownerEmail,
        apiKeyRotatedTemplate(tenant.name)
      );
    }

    // 4. Create new key linked to old key
    const newKey = await prisma.apiKey.create({
      data: {
        tenantId,
        keyHash: newHash,
        rotatedFromId: oldKeyId
      }
    });

    // 5. Set expiration on old key (15 minutes)
    await prisma.apiKey.update({
      where: { id: oldKeyId },
      data: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) }
    });

    return { newKey, rawKey };
  },


  async findByKeyHash(hash: string) {
    return prisma.apiKey.findFirst({
      where: { keyHash: hash },
      include: { tenant: true }
    });
  }

};