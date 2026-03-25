import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex"); // 64-char key
}

export async function hashKey(rawKey: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(rawKey, salt);
}

export async function verifyKey(rawKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawKey, hash);
}