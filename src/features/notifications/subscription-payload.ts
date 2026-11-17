import type { BrowserPushSubscription } from "@/features/notifications/types";

/** Converte a chave pública VAPID (base64url) no formato exigido por pushManager.subscribe. */
export function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

/** Monta o payload aceito por savePushSubscriptionAction (endpoint + keys aninhadas). */
export function toSubscriptionPayload(json: { endpoint?: string; keys?: Record<string, string> }): BrowserPushSubscription | null {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}
