import { Request, Response } from "express";
import { TenantService } from "./tenant.service";

export const TenantController = {
  async createTenant(req: Request, res: Response) {
    const { name, ownerEmail } = req.body;
    req.action = "USER_LOGIN";

    const tenant = await TenantService.createTenant(name, ownerEmail);

    return res.json({
      message: "Tenant created",
      tenant
    });
  }
};