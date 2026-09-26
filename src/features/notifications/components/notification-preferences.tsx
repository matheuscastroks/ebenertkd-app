"use client";

import { useState, useTransition } from "react";
import { Bell, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setNotificationPreferenceAction } from "@/app/actions/notifications";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences as Preferences } from "@/features/notifications/preferences-service";

const options = [
  { key: "announcements_enabled", label: "Comunicados", description: "Recados da academia e das turmas.", icon: Bell },
  { key: "financial_enabled", label: "Financeiro", description: "Lembretes de mensalidade e pagamento.", icon: CreditCard },
  { key: "system_enabled", label: "Sistema", description: "Atualizações importantes da sua conta.", icon: ShieldCheck }
] as const;

export function NotificationPreferences({ initial, showFinancial }: { initial: Preferences; showFinancial: boolean }) {
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

  return <div className="divide-y rounded-xl border">
    {options.filter((option) => showFinancial || option.key !== "financial_enabled").map(({ key, label, description, icon: Icon }) => <div key={key} className="flex items-center gap-3 p-4">
      <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{description}</p></div>
      <Switch aria-label={`Receber ${label.toLowerCase()} por notificação`} checked={preferences[key]} onCheckedChange={(checked) => change(key, checked)} disabled={pending} />
    </div>)}
  </div>;
}
