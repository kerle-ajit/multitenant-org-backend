import { prisma } from "../../config/db";
import { UserRole } from "@prisma/client";
import { EmailService } from "../email/email.service";
import userInviteTemplate from "../email/templates/userInvite";

export const UserService = {
  async createUser(tenantId: string, email: string, name: string, role: UserRole) {
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        role,
      },
    });

    await EmailService.enqueueEmail(
      tenantId,
      user.email,
      userInviteTemplate(user.name, name),
    );

    return user;
  },

  // trigger email queue
  

  async getUsersByTenant(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
    });
  },
};