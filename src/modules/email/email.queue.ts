import Bull from "bull";
import { env } from "../../config/env";

const BullQueue = (Bull as unknown as { default?: typeof Bull }).default ?? Bull;

export const emailQueue = new BullQueue("email-queue", env.REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    }
  }
});