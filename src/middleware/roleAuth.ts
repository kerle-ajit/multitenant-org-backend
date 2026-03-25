import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

export function requireRole(role: "OWNER" | "MEMBER") {
  return async function (req: Request, res: Response, next: NextFunction) {
    const userId = req.headers["x-user-id"] as string;

    if (!userId)
      return res.status(403).json({ error: "User ID missing" });

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== role)
      return res.status(403).json({ error: "Forbidden" });

    req.user = user;

    next();
  };
}