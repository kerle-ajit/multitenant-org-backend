import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.header("Idempotency-Key");

  if (!key) {
    return res.status(400).json({
      error: {
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "Idempotency-Key header is required for this endpoint"
      }
    });
  }

  const redisKey = `idem:${key}`;

  // Check if this key has already been used
  const existing = await redis.get(redisKey);

  if (existing) {
    // Return the cached response
    const data = JSON.parse(existing);
    return res.status(200).json(data);
  }

  // Patch res.json so we can capture the response before sending it
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    // Store response in Redis for 24 hours
    redis.set(redisKey, JSON.stringify(body), "EX", 24 * 60 * 60);
    return originalJson(body);
  };

  next();
}