import "server-only";

import { AppwriteException } from "node-appwrite";
import type { Models } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";

import { pushAllowed, type NotificationPreferences } from "@/features/notifications/preference-rules";

export { pushAllowed, type NotificationPreferences };

type PreferencesRow = Models.Row & NotificationPreferences & { account_id: string; updated_at: string };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  announcements_enabled: true,
  financial_enabled: true,
  system_enabled: true
};

export function getNotificationPreferences(accountId: string): Promise<NotificationPreferences> {
  return cachedRead(
    { name: "get-notification-preferences", key: [accountId], tags: [CACHE_TAGS.notificationPreferences(accountId)], revalidate: 300 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      try {
        const row = await tables.getRow<PreferencesRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationPreferences, rowId: accountId });
        return { announcements_enabled: row.announcements_enabled, financial_enabled: row.financial_enabled, system_enabled: row.system_enabled };
      } catch (error) {
        if (error instanceof AppwriteException && error.code === 404) return DEFAULT_NOTIFICATION_PREFERENCES;
        throw error;
      }
    }
  );
}

export async function setNotificationPreference(actor: Profile, key: keyof NotificationPreferences, enabled: boolean) {
  if (actor.role === "minor_student" && key === "financial_enabled") throw new Error("preference_not_allowed");
  const preferences = await getNotificationPreferences(actor.account_id);
  const { tables, config } = createAppwriteAdminClient();
  const data = { ...preferences, [key]: enabled, account_id: actor.account_id, updated_at: new Date().toISOString() };
  try {
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationPreferences, rowId: actor.account_id, data });
  } catch (error) {
    if (!(error instanceof AppwriteException && error.code === 404)) throw error;
    await tables.createRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationPreferences, rowId: actor.account_id, permissions: [], data });
  }
  return { ...preferences, [key]: enabled };
}
