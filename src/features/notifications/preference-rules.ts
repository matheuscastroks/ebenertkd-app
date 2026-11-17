import type { NotificationKind } from "@/features/notifications/types";

export type NotificationPreferences = {
  announcements_enabled: boolean;
  financial_enabled: boolean;
  system_enabled: boolean;
};

/** Só um `false` explícito bloqueia; null/undefined contam como ativado (padrão). */
export function pushAllowed(kind: NotificationKind, preferences: Partial<Record<keyof NotificationPreferences, boolean | null>>) {
  if (kind === "announcement") return preferences.announcements_enabled !== false;
  if (kind === "payment_reminder") return preferences.financial_enabled !== false;
  return preferences.system_enabled !== false;
}
