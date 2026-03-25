import { Request, Response, NextFunction } from "express";
import { slidingWindowLimit } from "../utils/rateLimit";
import { redis } from "../config/redis";          // add this
import { EmailService } from "../modules/email/email.service";
import  rateLimitWarningTemplate  from "../modules/email/templates/rateLimitWarning";

export function rateLimiter(config: { endpoint: string; limit: number }) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenant.id;
      const apiKeyId = req.apiKeyId;
      const endpoint = config.endpoint;
      req.action = "RATE_LIMIT_WARNING_SENT";

      const globalKey = `rate:global:${tenantId}`;
      const global = await slidingWindowLimit(globalKey, 1000, 60_000);

      const warnThreshold = Math.floor(0.8 * 1000); // 800
      if (global.count >= warnThreshold) {
        const warnKey = `rate:warn:${tenantId}`;
        const alreadyWarned = await redis.get(warnKey);
        if (!alreadyWarned) {
          await EmailService.enqueueEmail(
            tenantId,
            req.tenant.ownerEmail,
            rateLimitWarningTemplate(req.tenant.name, 80)
          );
          await redis.set(warnKey, "1", "EX", 3600);
        }
      }

      // endpoint and burst checks continue...
      const endpointKey = `rate:endpoint:${tenantId}:${endpoint}`;
      const ep = await slidingWindowLimit(endpointKey, config.limit, 60 * 1000);

      // 3️⃣ Burst limit per API key (50 req/5 sec)
      const burstKey = `rate:burst:${apiKeyId}`;
      const burst = await slidingWindowLimit(burstKey, 50, 5 * 1000);

      // Attach rate headers
      res.setHeader("X-RateLimit-Limit", config.limit);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, config.limit - ep.count));
      res.setHeader("X-RateLimit-Reset", ep.resetIn);

      // Check violations
      if (global.count > 1000) {
        return res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Global limit exceeded",
            details: {
              tier: "global",
              limit: 1000,
              count: global.count,
              resetIn: global.resetIn
            }
          }
        });
      }

      if (ep.count > config.limit) {
        return res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Endpoint limit exceeded",
            details: {
              tier: "endpoint",
              limit: config.limit,
              count: ep.count,
              resetIn: ep.resetIn
            }
          }
        });
      }

      if (burst.count > 50) {
        return res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Burst limit exceeded",
            details: {
              tier: "burst",
              limit: 50,
              count: burst.count,
              resetIn: burst.resetIn
            }
          }
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      res.status(500).json({
        error: { code: "RATE_LIMIT_ERROR", message: "Rate limit system failure" }
      });
    }
  };
}