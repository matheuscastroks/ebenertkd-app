import { describe, expect, it } from "vitest";
import { isSafeActionUrl } from "./action-url";
import { pushAllowed as appAllowed } from "./preference-rules";
import { buildPushPayload } from "./push-payload";
import { isSafeActionUrl as fnSafe, pushAllowed as fnAllowed, pushPayload as fnPayload } from "../../../appwrite/functions/daily-operations/src/push-rules.js";

describe("app and daily-operations push rules stay in sync", () => {
  const kinds = ["announcement", "payment_reminder", "system"] as const;
  const values = [true, false, null, undefined];

  it("pushAllowed agrees for every kind and preference value (including null)", () => {
    for (const kind of kinds) {
      for (const value of values) {
        const preferences = { announcements_enabled: value, financial_enabled: value, system_enabled: value };
        expect(fnAllowed(kind, preferences), `${kind}/${String(value)}`).toBe(appAllowed(kind, preferences));
      }
    }
  });

  it("push payload (brand, body, url fallback) is identical", () => {
    for (const action_url of ["/financeiro", null, undefined, "//evil.com", "https://evil.com", "/ok\nx"]) {
      const notification = { $id: "n1", action_url };
      expect(fnPayload(notification)).toEqual(buildPushPayload(notification));
    }
  });

  it("action url validation agrees", () => {
    for (const url of ["/a", "//a", "/\\a", "http://a", "/a\nb", "", "/"]) expect(fnSafe(url)).toBe(isSafeActionUrl(url));
  });
});
