import { DEFAULT_ACADEMY_IDENTITY } from "@/features/academy/defaults";
import { safeActionUrl } from "@/features/notifications/action-url";

export const PUSH_TITLE = DEFAULT_ACADEMY_IDENTITY.short_name;

/** Payload genérico: não expõe conteúdo (inclusive financeiro) na tela bloqueada. Espelhado em daily-operations/src/push-rules.js. */
export function buildPushPayload(notification: { $id: string; action_url?: string | null }, title: string = PUSH_TITLE) {
  return { title, body: "Você tem um novo aviso no aplicativo.", url: safeActionUrl(notification.action_url), tag: notification.$id };
}
