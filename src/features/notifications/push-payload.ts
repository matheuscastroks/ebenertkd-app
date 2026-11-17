import { safeActionUrl } from "@/features/notifications/action-url";

export const PUSH_TITLE = "Ebener TKD";

/** Payload genérico: não expõe conteúdo (inclusive financeiro) na tela bloqueada. Espelhado em daily-operations/src/push-rules.js. */
export function buildPushPayload(notification: { $id: string; action_url?: string | null }) {
  return { title: PUSH_TITLE, body: "Você tem um novo aviso no aplicativo.", url: safeActionUrl(notification.action_url), tag: notification.$id };
}
