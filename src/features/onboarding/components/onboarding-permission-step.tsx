"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { savePushSubscriptionAction } from "@/app/actions/notifications";
import type { RoleOnboardingConfig } from "../types";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function OnboardingPermissionStep({
  config,
  onComplete,
}: {
  config: RoleOnboardingConfig;
  onComplete: () => void;
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
          onComplete();
          return;
        }

        const result = await Notification.requestPermission();
        if (result === "granted") {
          setGranted(true);
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey(vapidKey),
            });
            const json = subscription.toJSON();
            if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
              await savePushSubscriptionAction({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
              });
            }
          }
          toast.success("Notificações ativadas com sucesso!");
        } else {
          toast.info("Avisos no aplicativo", {
            description: "Sem problemas! Todos os seus avisos estarão sempre disponíveis na aba Avisos.",
          });
        }
      } catch (err) {
        console.error("Push enable failed:", err);
      } finally {
        onComplete();
      }
    });
  };

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {config.pushTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          Fique por dentro das informações que realmente importam para o seu dia a dia no Taekwondo.
        </p>
      </div>

      {/* Card Ilustrativo de Benefício */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-6 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Bell className="size-7" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <p className="text-base font-semibold text-foreground">
            Avisos pontuais, sem spam
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {config.pushDescription}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-500" />
            100% Seguro
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone className="size-4 text-primary" />
            Direto no seu celular
          </span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="button"
          onClick={handleEnablePush}
          disabled={isPending || granted}
          className="w-full h-11 font-semibold"
        >
          {granted ? (
            <>
              <CheckCircle2 className="size-4 mr-2" /> Notificações Ativadas!
            </>
          ) : isPending ? (
            "Solicitando permissão..."
          ) : (
            "Ativar Notificações no Celular"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onComplete}
          disabled={isPending}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Agora não, continuar para o aplicativo
        </Button>
      </div>
    </div>
  );
}
