import { Bell, Moon, Shield, User } from "lucide-react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ThemePreference } from "@/components/dashboard/theme-preference";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ReplayOnboardingCard } from "@/features/onboarding/components/replay-onboarding-card";
import { getNotificationPreferences } from "@/features/notifications/preferences-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DeleteAccountDialog } from "@/app/configuracoes/DeleteAccountDialog";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const [preferences, pushActive] = await Promise.all([
    getNotificationPreferences(profile.account_id),
    hasActivePushSubscription(profile),
  ]);
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY
  );

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.settings}
      title="Configurações da conta"
      subtitle="Ajuste o tema visual, gerencie notificações push e administre sua sessão."
      breadcrumbs={[{ label: "Configurações" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna 1: Aparência e Conta */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">Aparência</h2>
              </div>
              <ThemePreference />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">Sessão e Segurança</h2>
              </div>
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <User className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{profile.full_name}</CardTitle>
                      <CardDescription className="text-xs">{profile.email || "Acesso de aluno menor"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 border-t border-border/40">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Deseja desconectar sua conta deste navegador?
                    </p>
                    <LogoutButton />
        <div className="mt-2">
          <DeleteAccountDialog />
        </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <ReplayOnboardingCard role={profile.role} />
            </section>
          </div>

          {/* Coluna 2: Notificações */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">Notificações</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Escolha quais categorias de mensagens podem gerar alertas. Todos os avisos continuam registrados na central de avisos.
              </p>
              <NotificationPreferences
                initial={preferences}
                showFinancial={profile.role !== "minor_student"}
              />
            </section>

            <section className="space-y-3">
              <PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} />
            </section>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
