import { describe, expect, it } from "vitest";
import { inboxItemView, notificationView } from "./notification-view";
import type { AppNotification, NotificationRecipient } from "./types";

class SDKRow {
  $id = "row-1";
  kind = "announcement";
  title = "Aula de sábado";
  body = "Treino às 9h";
  audience = "all";
  action_url = "/avisos";
  published_at = "2026-09-25T12:00:00Z";
  read_at = null;
  secret = "not-for-client";
}

describe("notification client views", () => {
  it("converts SDK row instances to plain, whitelisted objects", () => {
    const row = new SDKRow();
    const item = inboxItemView(row as unknown as NotificationRecipient, row as unknown as AppNotification);
    expect(Object.getPrototypeOf(item.recipient)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(item.notification)).toBe(Object.prototype);
    expect(item.notification).toEqual(notificationView(row as unknown as AppNotification));
    expect(item.notification).not.toHaveProperty("secret");
    expect(item.recipient).not.toHaveProperty("secret");
  });
});
