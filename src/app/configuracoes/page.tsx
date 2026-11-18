import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { isPushConfigured } from "@/features/notifications/push-config";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ThemePreference } from "@/components/dashboard/theme-preference";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { ReplayOnboardingCard } from "@/features/onboarding/components/replay-onboarding-card";
import { getNotificationPreferences } from "@/features/notifications/preferences-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { DeleteAccountSection } from "./delete-account-section";

function SettingsGroup({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="space-y-3">
    <div className="space-y-1">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </section>;
}

/**
 * Configurações em grupos de uso, do mais frequente ao mais raro:
 * notificações, aparência, conta e ajuda, e por último a exclusão da conta.
 */
export default async function SettingsPage() {
  const profile = await requireProfile();
  const [preferences, pushActive] = await Promise.all([
    getNotificationPreferences(profile.account_id),
    hasActivePushSubscription(profile).catch(() => false),
  ]);
  const pushConfigured = isPushConfigured();
  const minor = profile.role === "minor_student";

  return (
    <PortalShell profile={profile} activePath={ROUTES.settings} title="Configurações" subtitle="Notificações, aparência e conta." breadcrumbs={[{ label: "Configurações" }]}>
      <div className="w-full max-w-2xl space-y-8">
        <SettingsGroup id="settings-notifications" title="Notificações" description="Todos os avisos continuam na central de Avisos. Aqui você escolhe o que gera alerta.">
          <NotificationPreferences initial={preferences} showFinancial={!minor} />
          <PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} />
        </SettingsGroup>

        <SettingsGroup id="settings-appearance" title="Aparência">
          <ThemePreference />
        </SettingsGroup>

        <SettingsGroup id="settings-account" title="Conta">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{profile.email || (profile.username ? `Usuário: ${profile.username}` : "Acesso de aluno menor")}</p>
              </div>
              <LogoutButton />
            </div>
            <ReplayOnboardingCard role={profile.role} />
            <Link href={ROUTES.privacy} className="flex min-h-12 items-center justify-between gap-3 p-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none">
              Política de privacidade<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
        </SettingsGroup>

        <DeleteAccountSection />
      </div>
    </PortalShell>
  );
}
