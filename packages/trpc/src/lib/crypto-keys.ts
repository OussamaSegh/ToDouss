import { createHash, randomBytes } from "crypto";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): string {
  return `td_live_${randomBytes(24).toString("hex")}`;
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
