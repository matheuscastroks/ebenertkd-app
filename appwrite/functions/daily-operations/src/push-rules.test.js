import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, pushAllowed, pushPayload } from "./push-rules.js";

describe("daily-operations push rules", () => {
  it("respects the disabled category only", () => {
    const preferences = { ...DEFAULT_PREFERENCES, financial_enabled: false };
    expect(pushAllowed("payment_reminder", preferences)).toBe(false);
    expect(pushAllowed("system", preferences)).toBe(true);
    expect(pushAllowed("announcement", preferences)).toBe(true);
  });

  it("allows everything when the account has no saved preferences", () => {
    expect(pushAllowed("payment_reminder")).toBe(true);
  });

  it("uses the notification action url and the app name consistently", () => {
    expect(pushPayload({ $id: "n1", action_url: "/financeiro" })).toMatchObject({ title: "Ebener TKD", url: "/financeiro", tag: "n1" });
    expect(pushPayload({ $id: "n2" }).url).toBe("/avisos");
  });
});
