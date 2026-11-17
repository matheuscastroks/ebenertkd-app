import { randomBytes } from "node:crypto";
import webpush from "web-push";
import { isValidVapidSubject } from "../../src/features/notifications/push-config";

/** Gera um par VAPID e uma chave AES-256 (32 bytes, base64) para cifrar inscrições. */
export function generatePushKeys(subject: string) {
  if (!isValidVapidSubject(subject)) throw new Error("invalid_vapid_subject");
  const vapid = webpush.generateVAPIDKeys();
  return {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: subject,
    PUSH_SUBSCRIPTION_ENCRYPTION_KEY: randomBytes(32).toString("base64")
  };
}

export function formatEnv(keys: Record<string, string>) {
  return Object.entries(keys).map(([name, value]) => `${name}=${value}`).join("\n");
}
