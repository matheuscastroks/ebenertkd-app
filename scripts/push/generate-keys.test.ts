import { describe, expect, it } from "vitest";
import { isPushConfigured } from "../../src/features/notifications/push-config";
import { formatEnv, generatePushKeys } from "./generate-keys";

describe("generatePushKeys", () => {
  it("produces a configuration accepted by the app validation", () => {
    expect(isPushConfigured(generatePushKeys("mailto:professor@dojang.com.br"))).toBe(true);
  });

  it("never repeats keys between runs", () => {
    const a = generatePushKeys("mailto:a@dojang.com.br");
    const b = generatePushKeys("mailto:a@dojang.com.br");
    expect(a.VAPID_PRIVATE_KEY).not.toBe(b.VAPID_PRIVATE_KEY);
    expect(a.PUSH_SUBSCRIPTION_ENCRYPTION_KEY).not.toBe(b.PUSH_SUBSCRIPTION_ENCRYPTION_KEY);
  });

  it("refuses placeholder subjects", () => {
    expect(() => generatePushKeys("mailto:admin@example.com")).toThrow("invalid_vapid_subject");
  });

  it("formats as .env lines", () => {
    expect(formatEnv({ A: "1", B: "2" })).toBe("A=1\nB=2");
  });
});
