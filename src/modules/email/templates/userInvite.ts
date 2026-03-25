export default function userInviteTemplate(name: string, tenantName: string) {
  return {
    subject: `You are invited to join ${tenantName}`,
    body: `
      Hello ${name},

      You have been invited to join the tenant "${tenantName}".

      Please login using your assigned credentials.

      Regards,
      Multi-Tenant Platform
    `
  };
}