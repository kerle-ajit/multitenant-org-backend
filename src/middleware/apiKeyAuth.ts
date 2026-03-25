import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { verifyKey } from "../utils/crypto";

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.headers["x-api-key"] as string;

  if (!rawKey) {
    return res.status(401).json({ error: "API key missing" });
  }

  const allKeys = await prisma.apiKey.findMany({
    include: { tenant: true }
  });

  for (const key of allKeys) {
    const match = await verifyKey(rawKey, key.keyHash);

    if (match) {
      req.tenant = key.tenant;
      req.apiKeyId = key.id;
      return next();
    }
  }

  return res.status(401).json({ error: "Invalid API key" });
}