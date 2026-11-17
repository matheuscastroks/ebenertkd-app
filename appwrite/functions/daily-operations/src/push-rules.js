export const DEFAULT_PREFERENCES = { announcements_enabled: true, financial_enabled: true, system_enabled: true };

/** Mesma regra de src/features/notifications/preferences-service.ts (pushAllowed). */
export function pushAllowed(kind, preferences = DEFAULT_PREFERENCES) {
  if (kind === "announcement") return preferences.announcements_enabled !== false;
  if (kind === "payment_reminder") return preferences.financial_enabled !== false;
  return preferences.system_enabled !== false;
}

export const PUSH_TITLE = "Ebener TKD";

/** Payload genérico: não expõe conteúdo financeiro na tela bloqueada. */
export function pushPayload(notification) {
  return { title: PUSH_TITLE, body: "Você tem um novo aviso no aplicativo.", url: notification.action_url || "/avisos", tag: notification.$id };
}
