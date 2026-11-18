import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import {
  NotificationCountProvider,
  NotificationHeaderButton,
} from "@/components/dashboard/notification-nav-item";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InstallGuide } from "@/components/pwa/install-guide";

import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MobileGestureDetector } from "@/components/dashboard/mobile-gesture-detector";

type DashboardShellProps = {
  title: string;
  subtitle: string;
  badge: string;
  breadcrumbs?: BreadcrumbEntry[];
  headerActions?: ReactNode;
  children: ReactNode;
};

type DashboardFrameProps = Pick<DashboardShellProps, "badge" | "children"> & {
  profileName: string;
  profileEmail?: string;
  role?: string;
  avatarUrl?: string;
  navItems: AppSidebarNavItem[];
  unreadNotifications?: number;
};

export function DashboardFrame({
  badge,
  profileName,
  profileEmail,
  role,
  avatarUrl,
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
          avatarUrl={avatarUrl}
        />
        <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-sidebar md:h-full md:min-h-0 md:overflow-hidden">
          {children}
        </div>
        <MobileBottomNav navItems={navItems} />
        <MobileGestureDetector />
        <InstallGuide />
      </NotificationCountProvider>
    </SidebarProvider>
  );
}

/**
 * Moldura visual contínua em "L":
 * - Cabeçalho fixo no topo com o mesmo fundo da sidebar (`bg-sidebar`), contendo trilha,
 *   título, subtítulo, ações da tela e botão de notificações no canto superior direito.
 * - Painel de conteúdo saltado ("inset") abaixo do cabeçalho, com fundo `bg-background`,
 *   cantos arredondados e rolagem própria no desktop.
 */
export function DashboardShell({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children,
}: DashboardShellProps) {
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sidebar md:overflow-hidden">
      <header className="shrink-0 bg-sidebar px-4 pb-3 pt-4 md:px-6 md:pb-3.5 md:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 md:items-center">
          <div className="min-w-0 flex-1 space-y-0.5">
            {hasBreadcrumbs ? (
              <div className="mb-1 min-w-0">
                <PageBreadcrumb items={breadcrumbs!} />
              </div>
            ) : null}
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-foreground text-balance break-words">
              {title}
            </h1>
            <p className="max-w-prose text-sm text-muted-foreground text-pretty">
              {subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {headerActions ? (
              <div className="flex flex-wrap items-center gap-2">
                {headerActions}
              </div>
            ) : null}
            <NotificationHeaderButton />
          </div>
        </div>
      </header>

      <main
        data-slot="dashboard-content"
        className="relative flex min-h-0 flex-1 flex-col border-t border-border/60 bg-background md:mb-2 md:mr-2 md:overflow-y-auto md:rounded-xl md:border md:border-border/60 md:shadow-sm"
      >
        <div className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
          <div className="t-page-enter flex w-full min-w-0 flex-col gap-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
