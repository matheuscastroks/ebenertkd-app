"use client";

async function bounded<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), 1500); })]);
  } finally { if (timer) clearTimeout(timer); }
}

/** Only touches this origin's enrollment drafts and this browser's push subscription. */
export async function prepareLogout(): Promise<FormData> {
  const data = new FormData();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("enrollment-draft:")) localStorage.removeItem(key);
    }
  } catch { /* Storage restrictions must not prevent signing out. */ }
  try {
    if (!("serviceWorker" in navigator)) return data;
    const subscription = await bounded((async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return await registration?.pushManager.getSubscription() ?? null;
    })(), null);
    if (subscription) {
      data.set("push_endpoint", subscription.endpoint);
      try { await bounded(subscription.unsubscribe(), false); }
      catch { /* The server can still revoke the endpoint identified above. */ }
    }
  } catch { /* Push is optional; continue with session and cookie cleanup. */ }
  return data;
}
