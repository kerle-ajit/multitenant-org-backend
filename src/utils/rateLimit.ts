import { redis } from "../config/redis";

export async function slidingWindowLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();

  // Add current request timestamp
  await redis.zadd(key, now, now.toString());

  // Remove timestamps older than window size
  await redis.zremrangebyscore(key, 0, now - windowMs);

  // Get number of requests in the window
  const count = await redis.zcard(key);

  // Time until reset
  const oldest = await redis.zrange(key, 0, 0);
  const resetIn = oldest.length ? windowMs - (now - Number(oldest[0])) : windowMs;

  return { count, resetIn };
}