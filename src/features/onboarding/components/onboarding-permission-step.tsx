"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { savePushSubscriptionAction } from "@/app/actions/notifications";
import { applicationServerKey, toSubscriptionPayload } from "@/features/notifications/subscription-payload";
import type { RoleOnboardingConfig } from "../types";

export function OnboardingPermissionStep({
  config,
  onComplete,
  pending = false,
}: {
  config: RoleOnboardingConfig;
  onComplete: () => void;
  pending?: boolean;
}) {
  const [granted, setGranted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEnablePush = () => {
    startTransition(async () => {
      try {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          toast.info("Notificações no navegador", {
            description: "Este navegador não possui suporte a notificações push nativas. Você continuará recebendo tudo pela central de avisos.",
          });
          return;
        }

        const result = await Notification.requestPermission();
        if (result === "granted") {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) throw new Error("push_unavailable");
          if (vapidKey) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey(vapidKey),
            });
            const json = subscription.toJSON();
            const payload = toSubscriptionPayload(json);
            if (!payload) throw new Error("invalid_subscription");
            await savePushSubscriptionAction(payload);
          }
          toast.success("Notificações ativadas com sucesso!");
        } else {
          toast.info("Avisos no aplicativo", {
            description: "Sem problemas! Todos os seus avisos estarão sempre disponíveis na aba Avisos.",
          });
        }
      } catch {
        toast.error("Não foi possível ativar as notificações. Os avisos continuam no aplicativo.");
      } finally {
        onComplete();
      }
    });
  };

  return <div className="space-y-4 py-2">
    <h2 className="text-xl font-semibold">{config.pushTitle}</h2>
    <p className="text-sm text-muted-foreground">Receba avisos de aula e mensalidade neste aparelho.</p>
    <Button type="button" onClick={handleEnablePush} disabled={isPending || pending || granted} className="h-11 w-full">
      {isPending ? "Ativando…" : granted ? "Notificações ativadas" : "Ativar notificações"}
    </Button>
    <Button type="button" variant="outline" onClick={onComplete} disabled={isPending || pending} className="h-11 w-full">Agora não</Button>
  </div>;
}
