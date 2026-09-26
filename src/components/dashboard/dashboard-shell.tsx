import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

type DashboardFrameProps = Pick<DashboardShellProps, "badge" | "children"> & { profileName: string; navItems: AppSidebarNavItem[] };

export function DashboardFrame({ badge, profileName, navItems, children }: DashboardFrameProps) {
  return (
    <SidebarProvider>
      <ActiveSidebar badge={badge} navItems={navItems} profileName={profileName} />
      <SidebarInset>
        <div className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
        </div>
      </SidebarInset>
      <MobileBottomNav navItems={navItems} />
      <MobileGestureDetector />
      <InstallGuide />
    </SidebarProvider>
  );
}

export function DashboardShell({
  title,
  subtitle,
  badge,
  breadcrumbs,
  headerActions,
  children
}: DashboardShellProps) {
  return (
    <>
      <header className="flex flex-col gap-3 pb-2 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <SidebarTrigger className="mt-0.5 size-9 shrink-0 md:size-8" />
          <div className="space-y-1 min-w-0 flex-1">
            {breadcrumbs ? <PageBreadcrumb items={breadcrumbs} /> : null}
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl md:text-3xl break-words">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          </div>
        </div>
        {headerActions ? (
          <div className="flex flex-wrap items-center gap-2 pl-12 md:pl-0">{headerActions}</div>
        ) : null}
      </header>
      <div className="space-y-6">{children}</div>
    </>
  );
}
