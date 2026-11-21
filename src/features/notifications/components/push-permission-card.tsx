"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { BellOff } from "@/components/ui/icons";
import { toast } from "sonner";
import { revokePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/notifications";
import { BellIcon } from "@/components/ui/bell";
import { Button } from "@/components/ui/button";
import { applicationServerKey, toSubscriptionPayload } from "@/features/notifications/subscription-payload";

export function PushPermissionCard({
  configured,
  initiallyActive,
}: {
  configured: boolean;
  initiallyActive: boolean;
}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [active, setActive] = useState(initiallyActive);
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);
  const [enabling, startEnabling] = useTransition();
  const [disabling, startDisabling] = useTransition();
  const pending = enabling || disabling;

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
    startEnabling(async () => {
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
        const payload = toSubscriptionPayload(subscription.toJSON());
        if (!payload) throw new Error("invalid_subscription");
        await savePushSubscriptionAction(payload);
        setActive(true);
        toast.success("Alertas ativados neste aparelho");
      } catch {
        toast.error("Não foi possível ativar as notificações", {
          description: "Confira as permissões do navegador e tente novamente.",
        });
      }
    });

  const disable = () =>
    startDisabling(async () => {
      setOptimisticActive(false);
      setActive(false);
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await revokePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        toast.success("Alertas desativados neste aparelho");
      } catch {
        setActive(true);
        toast.error("Não foi possível desativar os alertas. Tente de novo.");
      }
    });

  const notice = !configured
    ? "O envio de alertas ainda não foi configurado pela academia."
    : permission === "unsupported"
      ? "Este navegador não oferece alertas. Os avisos continuam na central."
      : permission === "denied"
        ? "Os alertas estão bloqueados no navegador. Libere a permissão nas configurações do navegador."
        : null;

  return (
    <div className="space-y-3 rounded-xl bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Alertas neste aparelho</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {optimisticActive ? "Ativados. Você recebe avisos mesmo com o aplicativo fechado." : "Receba avisos mesmo com o aplicativo fechado."}
          </p>
        </div>
        {optimisticActive ? (
          <Button variant="outline" onClick={disable} disabled={pending} className="min-h-11 w-full shrink-0 sm:w-auto">
            <BellOff aria-hidden="true" />
            Desativar
          </Button>
        ) : (
          <Button onClick={enable} disabled={pending || Boolean(notice)} className="min-h-11 w-full shrink-0 sm:w-auto">
            <BellIcon aria-hidden="true" />
            {enabling ? "Ativando…" : "Ativar alertas"}
          </Button>
        )}
      </div>
      {notice ? <p role="status" className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
