import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { InstallGuide } from "@/components/pwa/install-guide";

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
        <div className="flex-1 p-4 md:p-6">
          <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
        </div>
      </SidebarInset>
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
      <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <SidebarTrigger className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            {breadcrumbs ? <PageBreadcrumb items={breadcrumbs} /> : null}
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{headerActions}</div>
      </header>
      <div className="space-y-6">{children}</div>
    </>
  );
}
