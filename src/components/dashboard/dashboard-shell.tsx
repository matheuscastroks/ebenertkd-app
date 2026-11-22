import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import {
  NotificationCountProvider,
  NotificationHeaderButton,
} from "@/components/dashboard/notification-nav-item";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { BackLink, NavItemsProvider, ScreenSegments, SectionSegments, type BackTarget } from "@/components/dashboard/section-nav";
import type { NavSegment } from "@/lib/navigation/routes";
import type { AppCapability } from "@/lib/auth/auth-utils";
import { SidebarProvider } from "@/components/ui/sidebar";

import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MobileGestureDetector } from "@/components/dashboard/mobile-gesture-detector";
import { PageTransition } from "@/components/dashboard/page-transition";

type DashboardShellProps = {
  title: ReactNode;
  subtitle: ReactNode;
  badge: string;
  /** Tela de detalhe (pilha): mostra "‹ label" acima do título e esconde os segmentos. */
  back?: BackTarget;
  /** Segmentos próprios da tela da pilha; aparecem mesmo com `back`. */
  segments?: NavSegment[];
  headerActions?: ReactNode;
  children: ReactNode;
};

type DashboardFrameProps = Pick<DashboardShellProps, "badge" | "children"> & {
  profileName: string;
  profileEmail?: string;
  role?: string;
  capabilities?: AppCapability[];
  avatarUrl?: string;
  avatarSex?: "feminino" | "masculino" | null;
  navItems: AppSidebarNavItem[];
  unreadNotifications?: number;
};

export function DashboardFrame({
  badge,
  profileName,
  profileEmail,
  role,
  capabilities,
  avatarUrl,
  avatarSex,
  navItems,
  unreadNotifications,
  children,
}: DashboardFrameProps) {
  const initialNotificationCount =
    unreadNotifications ??
    navItems.find((item) => item.icon === "notifications")?.badge ??
    0;

  return (
    <SidebarProvider open={true} className="md:h-svh md:overflow-hidden">
      <NotificationCountProvider initialCount={initialNotificationCount}>
        <ActiveSidebar
          badge={badge}
          navItems={navItems}
          profileName={profileName}
          profileEmail={profileEmail}
          role={role}
          capabilities={capabilities}
          avatarUrl={avatarUrl}
          avatarSex={avatarSex}
        />
        <NavItemsProvider items={navItems}>
          <PageTransition>{children}</PageTransition>
        </NavItemsProvider>
        <MobileBottomNav navItems={navItems} />
        <MobileGestureDetector />
      </NotificationCountProvider>
    </SidebarProvider>
  );
}

/**
 * Moldura visual contínua em "L":
 * - Cabeçalho fixo no topo com o mesmo fundo da sidebar (`bg-sidebar`), contendo o voltar da
 *   pilha (telas de detalhe), título, subtítulo, ações da tela, notificações. Os segmentos ficam no conteúdo da página.
 * - Painel de conteúdo saltado ("inset") abaixo do cabeçalho, com fundo `bg-background`,
 *   cantos arredondados e rolagem própria no desktop.
 */
export function DashboardShell({
  title,
  subtitle,
  back,
  segments,
  headerActions,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sidebar md:overflow-hidden">
      <header className="shrink-0 bg-sidebar px-4 pb-3 pt-4 md:px-6 md:pb-3.5 md:pt-4">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 md:flex-nowrap md:items-center md:gap-x-6">
          <div className="min-w-0 flex-1 space-y-0.5">
            {back ? (
              <div className="mb-1 min-w-0">
                <BackLink {...back} />
              </div>
            ) : null}
            <div key={typeof title === "string" ? title : undefined} className="t-text-reveal t-text-reveal--page space-y-0.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-foreground">
                {title}
              </h1>
              <p
                className="text-sm text-muted-foreground md:max-w-5xl md:truncate"
                title={typeof subtitle === "string" ? subtitle : undefined}
              >
                {subtitle}
              </p>
            </div>
          </div>

          {headerActions ? <HeaderActions>{headerActions}</HeaderActions> : null}
          <div className="flex shrink-0 items-center">
            <NotificationHeaderButton />
          </div>
        </div>
      </header>

      <main
        data-slot="dashboard-content"
        className="relative flex min-h-0 flex-1 flex-col bg-background md:mb-2 md:mr-2 md:overflow-y-auto md:rounded-xl md:shadow-inset-frame md:[box-shadow:var(--shadow-inset-frame)]"
      >
        <div className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
          <div className="flex w-full min-w-0 flex-col gap-6">
            {segments ? (
              <div className="min-w-0">
                <ScreenSegments label={typeof title === "string" ? `Seções de ${title}` : "Seções da tela"} segments={segments} />
              </div>
            ) : back ? null : (
              <div className="min-w-0 empty:hidden">
                <SectionSegments />
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
