import { prisma } from "../../config/db";

export const TenantService = {

    // create tenant
  async createTenant(name: string,ownerEmail:string) {
    return prisma.tenant.create({
      data: { name, ownerEmail }
    });
  },
   
  // get tenant by Id
  async getTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id }
    });
  }
};