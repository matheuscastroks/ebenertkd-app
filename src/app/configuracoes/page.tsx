import Link from "next/link";
import { User } from "lucide-react";
import { isPushConfigured } from "@/features/notifications/push-config";
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
import { DeleteAccountSection } from "./delete-account-section";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const [preferences, pushActive] = await Promise.all([
    getNotificationPreferences(profile.account_id),
    hasActivePushSubscription(profile),
  ]);
  const pushConfigured = isPushConfigured();

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.settings}
      title="Configurações da conta"
      subtitle="Tema, notificações e sessão"
      breadcrumbs={[{ label: "Configurações" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna 1: Aparência e Conta */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">

                <h2 className="text-base sm:text-lg font-semibold text-foreground">Aparência</h2>
              </div>
              <ThemePreference />
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">

                <h2 className="text-base sm:text-lg font-semibold text-foreground">Sessão e Segurança</h2>
              </div>
              <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <User className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{profile.full_name}</CardTitle>
                      <CardDescription className="text-sm">{profile.email || "Acesso de aluno menor"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 border-t border-border/40">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Deseja desconectar sua conta deste navegador?
                    </p>
                    <LogoutButton />

                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground">
                Saiba como tratamos seus dados na{" "}
                <Link href={ROUTES.privacy} className="font-medium text-primary-text underline-offset-4 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </section>

            <section className="space-y-3">
              <ReplayOnboardingCard role={profile.role} />
              <DeleteAccountSection />
            </section>
          </div>

          {/* Coluna 2: Notificações */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">

                <h2 className="text-base sm:text-lg font-semibold text-foreground">Notificações</h2>
              </div>
              <p className="text-sm text-muted-foreground">
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
