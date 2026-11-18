"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setNotificationPreferenceAction } from "@/app/actions/notifications";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences as Preferences } from "@/features/notifications/preferences-service";

const options = [
  {
    key: "announcements_enabled",
    label: "Comunicados e avisos",
    description: "Recados gerais da academia, turmas e avisos do professor.",
  },
  {
    key: "financial_enabled",
    label: "Mensalidades e pagamentos",
    description: "Lembretes preventivos de vencimento e confirmações de PIX.",
  },
  {
    key: "system_enabled",
    label: "Segurança e conta",
    description: "Alterações de senha, acessos e atualizações do sistema.",
  },
] as const;

export function NotificationPreferences({
  initial,
  showFinancial,
}: {
  initial: Preferences;
  showFinancial: boolean;
}) {
  const [preferences, setPreferences] = useState(initial);
  const [pending, startTransition] = useTransition();

  function change(key: keyof Preferences, enabled: boolean) {
    const previous = preferences;
    setPreferences({ ...preferences, [key]: enabled });
    startTransition(async () => {
      try {
        await setNotificationPreferenceAction(key, enabled);
        toast.success("Preferência salva");
      } catch {
        setPreferences(previous);
        toast.error("Não foi possível salvar a preferência");
      }
    });
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {options
        .filter((option) => showFinancial || option.key !== "financial_enabled")
        .map(({ key, label, description }) => (
          <div
            key={key}
            className="flex min-h-14 items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              aria-label={`Receber ${label.toLowerCase()} por notificação`}
              checked={preferences[key]}
              onCheckedChange={(checked) => change(key, checked)}
              disabled={pending}
              className="shrink-0"
            />
          </div>
        ))}
    </div>
  );
}
