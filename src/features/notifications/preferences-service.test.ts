import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DEFAULT_NOTIFICATION_PREFERENCES, pushAllowed } from "./preferences-service";

describe("notification push preferences", () => {
  it("keeps the existing delivery behavior by default", () => {
    expect(pushAllowed("announcement", DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
    expect(pushAllowed("payment_reminder", DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
    expect(pushAllowed("system", DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
  });

  it("blocks only the disabled category", () => {
    const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, financial_enabled: false };
    expect(pushAllowed("payment_reminder", preferences)).toBe(false);
    expect(pushAllowed("announcement", preferences)).toBe(true);
    expect(pushAllowed("system", preferences)).toBe(true);
  });
});
