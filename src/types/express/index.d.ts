declare namespace Express {
  export interface Request {
    tenant?: any;    // You can replace 'any' with real Prisma model type later
    user?: any;
    apiKeyId?: string;
    action?:string;
  }
}