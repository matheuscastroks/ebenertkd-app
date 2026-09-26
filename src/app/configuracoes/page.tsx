import { Bell, Moon } from "lucide-react";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ThemePreference } from "@/components/dashboard/theme-preference";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { getNotificationPreferences } from "@/features/notifications/preferences-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const [preferences, pushActive] = await Promise.all([getNotificationPreferences(profile.account_id), hasActivePushSubscription(profile)]);
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY);
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";

  return <PortalFrame profile={profile}><DashboardShell title="Configurações" subtitle="Ajuste a aparência e escolha como quer receber avisos." badge={badge}>
    <div className="grid gap-8 xl:grid-cols-2">
      <section className="space-y-4"><div className="flex items-center gap-2"><Moon className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-semibold">Aparência</h2></div><ThemePreference /></section>
      <section className="space-y-4"><div className="flex items-center gap-2"><Bell className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-semibold">Notificações</h2></div>
        <p className="text-sm text-muted-foreground">Escolha quais assuntos podem chegar ao navegador. Todas as mensagens continuam disponíveis em Avisos.</p>
        <NotificationPreferences initial={preferences} showFinancial={profile.role !== "minor_student"} />
        <div className="rounded-xl border p-4"><PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} /></div>
      </section>
    </div>
  </DashboardShell></PortalFrame>;
}
