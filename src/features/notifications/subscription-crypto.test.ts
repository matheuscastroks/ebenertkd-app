import { describe, expect, it } from "vitest";
import { decryptSubscription, encryptSubscription, endpointHash } from "./subscription-crypto";

describe("push subscription encryption", () => {
  const env = { NODE_ENV: "test", PUSH_SUBSCRIPTION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") } as NodeJS.ProcessEnv;
  const subscription = { endpoint: "https://push.example/device", keys: { p256dh: "public-key", auth: "auth-key" } };

  it("encrypts sensitive browser keys and decrypts them for delivery", () => {
    const encrypted = encryptSubscription(subscription, env);
    expect(encrypted).not.toContain(subscription.endpoint);
    expect(decryptSubscription(encrypted, env)).toEqual(subscription);
  });

  it("creates a stable endpoint identifier without storing the endpoint in clear text", () => {
    expect(endpointHash(subscription.endpoint)).toBe(endpointHash(subscription.endpoint));
    expect(endpointHash(subscription.endpoint)).not.toContain(subscription.endpoint);
  });
});
