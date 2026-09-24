import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { BrowserPushSubscription } from "@/features/notifications/types";

function encryptionKey(source: NodeJS.ProcessEnv = process.env) {
  const raw = source.PUSH_SUBSCRIPTION_ENCRYPTION_KEY;
  if (!raw) throw new Error("push_encryption_key_missing");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("push_encryption_key_invalid");
  return decoded;
}

export function endpointHash(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function encryptSubscription(subscription: BrowserPushSubscription, source?: NodeJS.ProcessEnv) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(source), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(subscription), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSubscription(value: string, source?: NodeJS.ProcessEnv): BrowserPushSubscription {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("push_subscription_invalid");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(source), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as BrowserPushSubscription;
}
