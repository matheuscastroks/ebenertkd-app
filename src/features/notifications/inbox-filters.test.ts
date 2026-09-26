import { describe, expect, it } from "vitest";
import { filterInboxItems } from "@/features/notifications/inbox-filters";
import type { InboxItem } from "@/features/notifications/types";

const items = [
  { recipient: { $id: "a", read_at: null }, notification: { kind: "announcement" } },
  { recipient: { $id: "b", read_at: "2026-09-24T12:00:00Z" }, notification: { kind: "payment_reminder" } },
  { recipient: { $id: "c", read_at: null }, notification: { kind: "system" } }
] as InboxItem[];

describe("filterInboxItems", () => {
  it("filters unread messages and category without changing order", () => {
    expect(filterInboxItems(items, "unread", "all", new Set(["b"])).map((item) => item.recipient.$id)).toEqual(["a", "c"]);
    expect(filterInboxItems(items, "all", "payment_reminder", new Set(["b"])).map((item) => item.recipient.$id)).toEqual(["b"]);
  });

  it("updates unread results after a message is marked read", () => {
    expect(filterInboxItems(items, "unread", "all", new Set(["a", "b"])).map((item) => item.recipient.$id)).toEqual(["c"]);
    expect(filterInboxItems(items, "unread", "all", new Set(["a", "b"]), new Set(["a"])).map((item) => item.recipient.$id)).toEqual(["a", "c"]);
  });
});
