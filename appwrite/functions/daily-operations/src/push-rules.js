export const DEFAULT_PREFERENCES = { announcements_enabled: true, financial_enabled: true, system_enabled: true };

/** Espelha src/features/notifications/preference-rules.ts: só `false` explícito bloqueia. */
export function pushAllowed(kind, preferences = DEFAULT_PREFERENCES) {
  if (kind === "announcement") return preferences.announcements_enabled !== false;
  if (kind === "payment_reminder") return preferences.financial_enabled !== false;
  return preferences.system_enabled !== false;
}

/** Espelha src/features/notifications/action-url.ts. */
export const isSafeActionUrl = (value) => typeof value === "string" && /^\/(?!\/)[^\\\r\n\t]*$/.test(value);

export const PUSH_TITLE = "Ebener TKD";

/** Espelha src/features/notifications/push-payload.ts. */
export function pushPayload(notification) {
  return { title: PUSH_TITLE, body: "Você tem um novo aviso no aplicativo.", url: isSafeActionUrl(notification.action_url) ? notification.action_url : "/avisos", tag: notification.$id };
}
