import nodemailer from "nodemailer";
import { emailQueue } from "./email.queue";
import { prisma } from "../../config/db";

export const EmailService = {
  async enqueueEmail(tenantId: string, recipient: string, template: any) {
    await emailQueue.add({
      tenantId,
      recipient,
      template
    });
  }
};