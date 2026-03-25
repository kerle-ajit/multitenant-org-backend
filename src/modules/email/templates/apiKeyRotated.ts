export default function apiKeyRotatedTemplate(tenantName: string) {
  return {
    subject: `Your API Key has been rotated`,
    body: `
      The API key for tenant "${tenantName}" has been rotated.

      Your old key will remain valid for 15 minutes.

      Regards,
      Multi-Tenant Platform
    `
  };
}