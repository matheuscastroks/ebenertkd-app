import "server-only";

import { createHash } from "node:crypto";
import { ID, Query } from "node-appwrite";
import webpush from "web-push";
import { z } from "zod";
import type { Profile } from "@/features/auth/types";
import { decryptSubscription, encryptSubscription, endpointHash } from "@/features/notifications/subscription-crypto";
import type { AppNotification, BrowserPushSubscription, NotificationDelivery, NotificationRecipient, PushSubscriptionRecord } from "@/features/notifications/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { getNotificationPreferences, pushAllowed } from "@/features/notifications/preferences-service";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(1024), auth: z.string().min(1).max(512) })
});
const stableId = (...parts: string[]) => createHash("sha256").update(parts.join(":" )).digest("hex").slice(0, 36);

function vapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("vapid_not_configured");
  return { publicKey, privateKey, subject };
}

export async function savePushSubscription(actor: Profile, raw: unknown, userAgent?: string) {
  const input = subscriptionSchema.parse(raw) as BrowserPushSubscription;
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const hash = endpointHash(input.endpoint);
  const existing = await tables.listRows<PushSubscriptionRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, queries: [Query.equal("endpoint_hash", [hash]), Query.limit(1)] });
  const data = { profile_id: actor.$id, account_id: actor.account_id, subscription_ciphertext: encryptSubscription(input), user_agent: userAgent?.slice(0, 512), status: "active" as const, last_seen_at: now, updated_at: now };
  if (existing.rows[0]) return tables.updateRow<PushSubscriptionRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, rowId: existing.rows[0].$id, data });
  return tables.createRow<PushSubscriptionRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, rowId: ID.unique(), permissions: [], data: { ...data, endpoint_hash: hash, created_at: now } });
}

export async function revokePushSubscription(actor: Profile, endpoint: string) {
  const { tables, config } = createAppwriteAdminClient();
  const found = await tables.listRows<PushSubscriptionRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, queries: [Query.equal("endpoint_hash", [endpointHash(endpoint)]), Query.equal("account_id", [actor.account_id]), Query.limit(1)] });
  if (!found.rows[0]) return;
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, rowId: found.rows[0].$id, data: { status: "revoked", updated_at: new Date().toISOString() } });
}

export async function hasActivePushSubscription(actor: Profile) {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, queries: [Query.equal("profile_id", [actor.$id]), Query.equal("status", ["active"]), Query.limit(1)] });
  return result.total > 0;
}

export async function deliverNotificationPush(notification: AppNotification, recipient: NotificationRecipient) {
  if (!pushAllowed(notification.kind, await getNotificationPreferences(recipient.account_id))) return;
  const { publicKey, privateKey, subject } = vapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { tables, config } = createAppwriteAdminClient();
  const subscriptions = await tables.listRows<PushSubscriptionRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, queries: [Query.equal("profile_id", [recipient.profile_id]), Query.equal("status", ["active"]), Query.limit(50)] });
  const now = new Date().toISOString();

  await Promise.all(subscriptions.rows.map(async (subscription) => {
    const rowId = stableId(recipient.$id, subscription.$id);
    let delivery: NotificationDelivery;
    try {
      delivery = await tables.getRow<NotificationDelivery>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationDeliveries, rowId });
      if (delivery.status === "sent") return;
    } catch {
      delivery = await tables.createRow<NotificationDelivery>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationDeliveries, rowId, permissions: [], data: { notification_id: notification.$id, recipient_id: recipient.$id, subscription_id: subscription.$id, channel: "push", status: "pending", attempts: 0, created_at: now, updated_at: now } });
    }

    try {
      const target = decryptSubscription(subscription.subscription_ciphertext);
      await webpush.sendNotification(target, JSON.stringify({ title: "Ebener TKD", body: "Você tem um novo aviso no aplicativo.", url: notification.action_url ?? "/avisos", tag: notification.$id }));
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationDeliveries, rowId, data: { status: "sent", attempts: delivery.attempts + 1, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() } });
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      const expired = statusCode === 404 || statusCode === 410;
      if (expired) await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.pushSubscriptions, rowId: subscription.$id, data: { status: "expired", updated_at: new Date().toISOString() } });
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationDeliveries, rowId, data: { status: expired ? "expired" : "failed", attempts: delivery.attempts + 1, last_error: safeErrorMessage(error, "push_failed"), updated_at: new Date().toISOString() } });
    }
  }));
}
