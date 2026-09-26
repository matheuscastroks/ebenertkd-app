"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markNotificationRead, publishAnnouncement } from "@/features/notifications/notification-service";
import { revokePushSubscription, savePushSubscription } from "@/features/notifications/push-service";
import { setNotificationPreference, type NotificationPreferences } from "@/features/notifications/preferences-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export async function publishAnnouncementAction(formData: FormData) {
  const actor = await requireProfile("admin");
  const audience = String(formData.get("audience") ?? "all");
  const audienceId = audience === "class" ? String(formData.get("class_id") ?? "") : audience === "profile" ? String(formData.get("profile_id") ?? "") : undefined;
  try {
    await publishAnnouncement(actor, { title: formData.get("title"), body: formData.get("body"), audience, audienceId, actionUrl: formData.get("action_url") || "/avisos" });
  } catch { redirect(`${ROUTES.notifications}?error=publish`); }
  revalidatePath(ROUTES.notifications);
  redirect(`${ROUTES.notifications}?published=1`);
}

export async function markNotificationReadAction(formData: FormData) {
  const actor = await requireProfile();
  await markNotificationRead(actor, String(formData.get("recipient_id") ?? ""));
  revalidatePath(ROUTES.notifications);
}

export async function savePushSubscriptionAction(subscription: unknown) {
  const actor = await requireProfile();
  const requestHeaders = await headers();
  await savePushSubscription(actor, subscription, requestHeaders.get("user-agent") ?? undefined);
  revalidatePath(ROUTES.notifications);
}

export async function revokePushSubscriptionAction(endpoint: string) {
  const actor = await requireProfile();
  await revokePushSubscription(actor, endpoint);
  revalidatePath(ROUTES.notifications);
}

export async function setNotificationPreferenceAction(key: keyof NotificationPreferences, enabled: boolean) {
  const actor = await requireProfile();
  if (!["announcements_enabled", "financial_enabled", "system_enabled"].includes(key) || typeof enabled !== "boolean") throw new Error("invalid_preference");
  await setNotificationPreference(actor, key, enabled);
}
