import { describe, expect, it } from "vitest";
import { applicationServerKey, toSubscriptionPayload } from "./subscription-payload";

describe("browser push subscription payload", () => {
  it("nests keys the way the server schema expects", () => {
    expect(toSubscriptionPayload({ endpoint: "https://push.example/x", keys: { p256dh: "p", auth: "a" } })).toEqual({ endpoint: "https://push.example/x", keys: { p256dh: "p", auth: "a" } });
  });

  it("rejects incomplete subscriptions", () => {
    expect(toSubscriptionPayload({ endpoint: "https://push.example/x", keys: { p256dh: "p" } })).toBeNull();
    expect(toSubscriptionPayload({})).toBeNull();
  });

  it("decodes base64url VAPID keys", () => {
    expect(Array.from(applicationServerKey("_-8"))).toEqual([255, 239]);
  });
});
