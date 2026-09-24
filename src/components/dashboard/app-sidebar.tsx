import Link from "next/link";
import { Bell, Building2, ClipboardList, FileSignature, LayoutDashboard, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export type AppSidebarNavItem = {
  label: string;
  href: string;
  active?: boolean;
  icon?: "dashboard" | "enrollment" | "students" | "classes" | "family" | "contracts";
};

const navIcons = {
  dashboard: LayoutDashboard,
  enrollment: ClipboardList,
  students: UsersRound,
  classes: Building2,
  family: UserRound,
  contracts: FileSignature
};

export function AppSidebar({
  badge,
  navItems,
  asideTitle,
  asideCopy
}: {
  badge: string;
  navItems: AppSidebarNavItem[];
  asideTitle: string;
  asideCopy: string;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">E</div>
          <div className="min-w-0 flex-1 space-y-1 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold">Ebenert KD</p>
            <p className="text-xs text-muted-foreground">{badge}</p>
          </div>
          <Badge variant="outline" className="rounded-md group-data-[collapsible=icon]:hidden">
            PWA
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = navIcons[item.icon ?? "dashboard"];
                return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );})}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border bg-muted/50 p-3 group-data-[collapsible=icon]:hidden">
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{asideTitle}</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{asideCopy}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Estrutura pronta para permissões e notificações.
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
