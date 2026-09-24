"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { revokePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function PushPermissionCard({ configured, initiallyActive }: { configured: boolean; initiallyActive: boolean }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [active, setActive] = useState(initiallyActive);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const initialize = window.setTimeout(() => setPermission("Notification" in window && "serviceWorker" in navigator && "PushManager" in window ? Notification.permission : "unsupported"), 0);
    return () => window.clearTimeout(initialize);
  }, []);

  const enable = () => startTransition(async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.warning("Permissão não concedida", { description: "Os avisos continuarão disponíveis nesta tela." });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "") });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("invalid_subscription");
      await savePushSubscriptionAction({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      setActive(true);
      toast.success("Notificações ativadas neste dispositivo");
    } catch {
      toast.error("Não foi possível ativar as notificações", { description: "Confira as permissões do navegador e tente novamente." });
    }
  });

  const disable = () => startTransition(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await revokePushSubscriptionAction(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setActive(false);
    toast.success("Notificações desativadas neste dispositivo");
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Smartphone aria-hidden="true" className="size-5" /></div>
        <div><CardTitle className="text-base">Notificações neste celular</CardTitle><CardDescription>O conteúdo da tela bloqueada é sempre genérico. Os detalhes ficam protegidos no aplicativo.</CardDescription></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured ? <p className="text-sm text-warning-foreground">O envio push ainda não foi configurado pelo administrador.</p> : null}
        {permission === "unsupported" ? <p className="text-sm text-muted-foreground">Este navegador não oferece suporte a notificações web.</p> : null}
        {permission === "denied" ? <p className="text-sm text-muted-foreground">A permissão está bloqueada nas configurações do navegador.</p> : null}
        {active ? <Button variant="outline" onClick={disable} disabled={pending}><BellOff aria-hidden="true" />Desativar neste dispositivo</Button> : <Button onClick={enable} disabled={pending || !configured || permission === "unsupported" || permission === "denied"}><Bell aria-hidden="true" />{pending ? "Ativando…" : "Ativar notificações"}</Button>}
      </CardContent>
    </Card>
  );
}
