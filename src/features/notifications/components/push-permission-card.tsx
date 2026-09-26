"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { revokePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function PushPermissionCard({
  configured,
  initiallyActive,
}: {
  configured: boolean;
  initiallyActive: boolean;
}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [active, setActive] = useState(initiallyActive);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const initialize = window.setTimeout(
      () =>
        setPermission(
          "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
            ? Notification.permission
            : "unsupported"
        ),
      0
    );
    return () => window.clearTimeout(initialize);
  }, []);

  const enable = () =>
    startTransition(async () => {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          toast.warning("Permissão não concedida", {
            description: "Os avisos continuarão disponíveis no aplicativo em Avisos.",
          });
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
          throw new Error("invalid_subscription");
        }
        await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        setActive(true);
        toast.success("Notificações ativadas neste dispositivo com sucesso");
      } catch {
        toast.error("Não foi possível ativar as notificações", {
          description: "Confira as permissões do navegador e tente novamente.",
        });
      }
    });

  const disable = () =>
    startTransition(async () => {
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
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Smartphone aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Avisos no navegador e celular</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Receba alertas instantâneos de novos comunicados mesmo com o aplicativo fechado.
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {!configured ? (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            O envio push ainda não foi configurado pelo administrador da academia.
          </p>
        ) : null}
        {permission === "unsupported" ? (
          <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40">
            Este navegador não oferece suporte a notificações web.
          </p>
        ) : null}
        {permission === "denied" ? (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            As notificações estão bloqueadas nas preferências do seu navegador. Libere a permissão para receber alertas.
          </p>
        ) : null}

        {active ? (
          <Button
            variant="outline"
            onClick={disable}
            disabled={pending}
            className="h-11 font-medium w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <BellOff className="mr-2 size-4" aria-hidden="true" />
            Desativar neste dispositivo
          </Button>
        ) : (
          <Button
            onClick={enable}
            disabled={
              pending || !configured || permission === "unsupported" || permission === "denied"
            }
            className="h-11 font-medium w-full sm:w-auto"
          >
            <Bell className="mr-2 size-4" aria-hidden="true" />
            {pending ? "Ativando…" : "Ativar notificações neste aparelho"}
          </Button>
        )}
      </div>
    </div>
  );
}
