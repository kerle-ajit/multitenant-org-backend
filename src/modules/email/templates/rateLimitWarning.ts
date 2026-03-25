export default function rateLimitWarningTemplate(tenantName: string, usage: number) {
  return {
    subject: `Rate Limit Warning`,
    body: `
      Tenant "${tenantName}" has reached ${usage}% of the global rate limit.

      You will receive this warning at most once per hour.

      Regards,
      Multi-Tenant Platform
    `
  };
}