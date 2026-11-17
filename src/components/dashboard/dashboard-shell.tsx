import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { InstallGuide } from "@/components/pwa/install-guide";

import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MobileGestureDetector } from "@/components/dashboard/mobile-gesture-detector";
import { cn } from "@/lib/utils";

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
};

export function DashboardFrame({
  badge,
  profileName,
  profileEmail,
  role,
  avatarUrl,
  navItems,
  children
}: DashboardFrameProps) {
  return (
    <SidebarProvider>
      <ActiveSidebar
        badge={badge}
        navItems={navItems}
        profileName={profileName}
        profileEmail={profileEmail}
        role={role}
        avatarUrl={avatarUrl}
      />
      <SidebarInset className="min-w-0">
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
 * Cabeçalho de página comum: barra de ferramentas (menu lateral e trilha) no desktop,
 * um único título, um subtítulo curto e a ação principal alinhada à direita.
 * No mobile o menu fica na barra inferior, então o título ocupa a largura toda.
 */
export function DashboardShell({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children
}: DashboardShellProps) {
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className={cn("-ml-1.5 min-h-8 items-center gap-2", hasBreadcrumbs ? "flex" : "hidden md:flex")}>
          <SidebarTrigger className="hidden size-8 shrink-0 text-muted-foreground hover:text-foreground md:inline-flex" />
          {hasBreadcrumbs ? (
            <>
              <span aria-hidden="true" className="hidden h-4 w-px bg-border md:block" />
              <div className="min-w-0 pl-1.5 md:pl-0">
                <PageBreadcrumb items={breadcrumbs!} />
              </div>
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance break-words">{title}</h1>
            <p className="max-w-prose text-sm text-muted-foreground text-pretty">{subtitle}</p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </>
  );
}
