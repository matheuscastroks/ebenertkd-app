import type { AppNotification, InboxItem, NotificationRecipient, NotificationView } from "@/features/notifications/types";

export function notificationView(row: AppNotification): NotificationView {
  return {
    $id: row.$id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    audience: row.audience,
    action_url: row.action_url ?? null,
    published_at: row.published_at
  };
}

export function inboxItemView(recipient: NotificationRecipient, notification: AppNotification): InboxItem {
  return {
    recipient: { $id: recipient.$id, read_at: recipient.read_at ?? null },
    notification: notificationView(notification)
  };
}
