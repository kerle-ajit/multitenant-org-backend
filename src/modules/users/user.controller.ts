import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { UserService } from "./user.service";

export const UserController = {
  async createUser(req: Request, res: Response) {
    const { email, name, role } = req.body;
    const tenantId  = req.tenant.id;
    req.action = "USER_CREATED";

    if (!email) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Email is required",
      };
    }

    const safeRole: UserRole = role === "OWNER" ? "OWNER" : "MEMBER";
    const user = await UserService.createUser(tenantId, email, name, safeRole);

    return res.json({
      message: "User created",
      user
    });
  }
};