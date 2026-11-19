import { getAcademyIdentity } from "@/features/academy/config-service";
import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Palette, Shield, User } from "@/components/ui/icons";
import { isPushConfigured } from "@/features/notifications/push-config";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ThemePreference } from "@/components/dashboard/theme-preference";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { getNotificationPreferences } from "@/features/notifications/preferences-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OperationToast } from "@/components/shared/operation-toast";
import { DeleteAccountSection } from "./delete-account-section";
import { ProfileEditor } from "./profile-editor";
import { InstallAppCard } from "@/components/pwa/install-app-card";

function SettingsGroup({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="space-y-1">
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const [profile, query] = await Promise.all([requireProfile(), searchParams]);
  const [preferences, pushActive, identity] = await Promise.all([
    getNotificationPreferences(profile.account_id),
    hasActivePushSubscription(profile).catch(() => false),
    getAcademyIdentity(),
  ]);
  const pushConfigured = isPushConfigured();
  const minor = profile.role === "minor_student";

  let avatarUrl: string | undefined;
  try {
    if (profile.onboarding_preferences) {
      const prefs = JSON.parse(profile.onboarding_preferences) as { avatar_file_id?: string };
      if (prefs.avatar_file_id) {
        avatarUrl = `/api/profile/avatar/${prefs.avatar_file_id}`;
      }
    }
  } catch {
    // Ignore invalid JSON
  }

  const defaultTab = query.tab || (profile.role === "admin" ? "profile" : "preferences");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.settings}
      title="Configurações"
      subtitle="Gerencie seu perfil, preferências de notificações, tema e conta."
      breadcrumbs={[{ label: "Configurações" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        {query.saved === "profile" ? (
          <OperationToast
            tone="success"
            title="Perfil atualizado com sucesso"
            description="As alterações no seu cadastro e foto foram salvas."
            clearParams={["saved"]}
          />
        ) : null}
        {query.error === "name_required" ? (
          <OperationToast
            tone="error"
            title="Nome completo é obrigatório"
            description="Por favor, preencha o seu nome completo."
            clearParams={["error"]}
          />
        ) : null}
        {query.error === "invalid_photo" ? (
          <OperationToast
            tone="error"
            title="Formato de foto inválido"
            description="Envie uma imagem em formato JPG, PNG ou WebP com no máximo 5MB."
            clearParams={["error"]}
          />
        ) : null}

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3 gap-1 rounded-xl bg-muted/80 p-1">
            <TabsTrigger value="profile" className="min-h-11 rounded-lg text-sm font-medium">
              <User className="mr-2 size-4" aria-hidden="true" />
              Meu Perfil
            </TabsTrigger>
            <TabsTrigger value="preferences" className="min-h-11 rounded-lg text-sm font-medium">
              <Bell className="mr-2 size-4" aria-hidden="true" />
              Notificações & Aparência
            </TabsTrigger>
            <TabsTrigger value="account" className="min-h-11 rounded-lg text-sm font-medium">
              <Shield className="mr-2 size-4" aria-hidden="true" />
              Conta & Segurança
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: Meu Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <SettingsGroup
              id="settings-profile"
              title="Cadastro e Imagem do Usuário"
              description="Atualize sua foto de perfil, nome completo e informações de acesso."
            >
              <ProfileEditor profile={profile} currentAvatarUrl={avatarUrl} />
            </SettingsGroup>
          </TabsContent>

          {/* ABA 2: Notificações & Aparência */}
          <TabsContent value="preferences" className="space-y-8">
            <SettingsGroup
              id="settings-notifications"
              title="Notificações"
              description="Todos os comunicados continuam na central de Avisos. Escolha aqui quais alertas deseja receber."
            >
              <NotificationPreferences initial={preferences} showFinancial={!minor} />
              <PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} />
            </SettingsGroup>

            <SettingsGroup id="settings-appearance" title="Aparência">
              <ThemePreference />
            </SettingsGroup>

            <SettingsGroup
              id="settings-app"
              title="Aplicativo no Celular"
              description={`Instale o ${identity.short_name} no seu smartphone para acessar treinos e avisos direto da tela de início.`}
            >
              <InstallAppCard />
            </SettingsGroup>
          </TabsContent>

          {/* ABA 3: Conta & Segurança */}
          <TabsContent value="account" className="space-y-8">
            <SettingsGroup id="settings-account" title="Conta">
              <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{profile.full_name}</p>
                    <p className="truncate text-xs sm:text-sm text-muted-foreground">
                      {profile.email || (profile.username ? `Usuário: ${profile.username}` : "Acesso de aluno menor")}
                    </p>
                  </div>
                  <LogoutButton />
                </div>
                <Link
                  href={ROUTES.privacy}
                  className="flex min-h-12 items-center justify-between gap-3 p-4 text-sm font-medium transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  Política de privacidade
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </div>
            </SettingsGroup>

            <DeleteAccountSection />
          </TabsContent>
        </Tabs>
      </div>
    </PortalShell>
  );
}
