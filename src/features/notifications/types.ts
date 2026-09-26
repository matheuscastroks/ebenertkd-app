import type { Models } from "node-appwrite";

export type NotificationKind = "announcement" | "payment_reminder" | "system";
export type NotificationAudience = "all" | "class" | "profile" | "system";

export type AppNotification = Models.Row & {
  kind: NotificationKind;
  title: string;
  body: string;
  audience: NotificationAudience;
  audience_id?: string | null;
  action_url?: string | null;
  dedupe_key: string;
  created_by_account_id?: string | null;
  published_at: string;
  created_at: string;
};

export type NotificationRecipient = Models.Row & {
  notification_id: string;
  profile_id: string;
  account_id: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRecord = Models.Row & {
  profile_id: string;
  account_id: string;
  endpoint_hash: string;
  subscription_ciphertext: string;
  user_agent?: string | null;
  status: "active" | "expired" | "revoked";
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type NotificationDelivery = Models.Row & {
  notification_id: string;
  recipient_id: string;
  subscription_id: string;
  channel: "push";
  status: "pending" | "sent" | "failed" | "expired" | "skipped";
  attempts: number;
  last_error?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationView = Pick<AppNotification, "$id" | "kind" | "title" | "body" | "audience" | "action_url" | "published_at">;
export type RecipientView = Pick<NotificationRecipient, "$id" | "read_at">;
export type InboxItem = { notification: NotificationView; recipient: RecipientView };
export type BrowserPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };
