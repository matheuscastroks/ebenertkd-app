import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { NotificationTopButton } from "@/components/dashboard/notification-nav-item";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
    <SidebarProvider open={true}>
      <ActiveSidebar
        badge={badge}
        navItems={navItems}
        profileName={profileName}
        profileEmail={profileEmail}
        role={role}
        avatarUrl={avatarUrl}
      />
      <SidebarInset className="min-w-0">
        <NotificationTopButton initialCount={initialNotificationCount} />
        <div className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
          <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
        </div>
      </SidebarInset>
      <MobileBottomNav navItems={navItems} />
      <MobileGestureDetector />
      <InstallGuide />
    </SidebarProvider>
  );
}

/**
 * Cabeçalho de página comum: trilha quando há navegação hierárquica,
 * um único título, subtítulo curto e ação principal alinhada à direita,
 * com margem reservada para o botão fixo de notificações no canto superior direito.
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
    <>
      <header className="flex flex-col gap-2 pr-14">
        {hasBreadcrumbs ? (
          <div className="min-w-0">
            <PageBreadcrumb items={breadcrumbs!} />
          </div>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance break-words">
              {title}
            </h1>
            <p className="max-w-prose text-sm text-muted-foreground text-pretty">
              {subtitle}
            </p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>
      <div className="t-page-enter space-y-6">{children}</div>
    </>
  );
}
