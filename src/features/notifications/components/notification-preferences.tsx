"use client";

import { useState, useTransition } from "react";
import { Bell, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setNotificationPreferenceAction } from "@/app/actions/notifications";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences as Preferences } from "@/features/notifications/preferences-service";

const options = [
  {
    key: "announcements_enabled",
    label: "Comunicados e avisos",
    description: "Recados gerais da academia, turmas e avisos do professor.",
    icon: Bell,
  },
  {
    key: "financial_enabled",
    label: "Mensalidades e pagamentos",
    description: "Lembretes preventivos de vencimento e confirmações de PIX.",
    icon: CreditCard,
  },
  {
    key: "system_enabled",
    label: "Segurança e conta",
    description: "Alterações de senha, acessos e atualizações do sistema.",
    icon: ShieldCheck,
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
        toast.success("Preferência salva com sucesso");
      } catch {
        setPreferences(previous);
        toast.error("Não foi possível salvar a preferência");
      }
    });
  }

  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
      {options
        .filter((option) => showFinancial || option.key !== "financial_enabled")
        .map(({ key, label, description, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/10 min-h-[56px]"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
              </div>
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
