import type { ReactNode } from "react";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { PageBreadcrumb, type BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

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
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </div>
      </SidebarInset>
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
      <header className="flex flex-col gap-4 rounded-xl border bg-background p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <SidebarTrigger />
          <div className="space-y-1">
            {breadcrumbs ? <PageBreadcrumb items={breadcrumbs} /> : null}
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <Badge variant="outline">{badge}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{headerActions}</div>
      </header>
      <div className="space-y-6">{children}</div>
    </>
  );
}
