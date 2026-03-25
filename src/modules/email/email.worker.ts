import nodemailer from "nodemailer";
import { Job } from "bull";
import { emailQueue } from "./email.queue";
import { prisma } from "../../config/db";
import { env } from "../../config/env";

const dlq = "email-dead-letter-queue";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

emailQueue.process(async (job: Job) => {
  const { tenantId, recipient, template } = job.data as {
    tenantId: string;
    recipient: string;
    template: { subject: string; body: string };
  };

  try {
    const info = await transporter.sendMail({
      from: "noreply@multitenant.local",
      to: recipient,
      subject: template.subject,
      text: template.body,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      // Useful when using Ethereal SMTP.
      console.log(`Email preview: ${preview}`);
    }

    await prisma.emailLog.create({
      data: {
        tenantId,
        recipient,
        template: template.subject,
        status: "SENT",
        attempts: job.attemptsMade + 1,
      },
    });
  } catch (error: any) {
    if (job.attemptsMade >= 2) {
      await prisma.emailLog.create({
        data: {
          tenantId,
          recipient,
          template: template.subject,
          status: "FAILED",
          attempts: job.attemptsMade + 1,
          error: error?.message ?? "Unknown mail error",
        },
      });

      await emailQueue.add(
        dlq,
        {
          tenantId,
          recipient,
          template,
          reason: error?.message ?? "Unknown mail error",
        },
        { removeOnComplete: false, removeOnFail: false },
      );
    }

    throw error;
  }
});

console.log("Email worker started");
