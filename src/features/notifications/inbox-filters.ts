import type { InboxItem, NotificationKind } from "@/features/notifications/types";

export type InboxReadFilter = "all" | "unread";
export type InboxKindFilter = "all" | NotificationKind;

export function filterInboxItems(items: InboxItem[], readFilter: InboxReadFilter, kindFilter: InboxKindFilter, readIds: Set<string>, openedIds: Set<string> = new Set()) {
  return items.filter((item) => (readFilter === "all" || !readIds.has(item.recipient.$id) || openedIds.has(item.recipient.$id)) && (kindFilter === "all" || item.notification.kind === kindFilter));
}
