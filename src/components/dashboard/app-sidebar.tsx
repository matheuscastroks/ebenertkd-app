import Link from "next/link";
import { Building2, ClipboardList, FileSignature, LayoutDashboard, UserRound, UsersRound, WalletCards } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/dashboard/logout-button";

export type AppSidebarNavItem = {
  label: string;
  href: string;
  active?: boolean;
  group?: "Principal" | "Alunos" | "Operação" | "Financeiro" | "Documentos";
  icon?: "dashboard" | "enrollment" | "students" | "classes" | "family" | "contracts" | "billing";
};

const navIcons = {
  dashboard: LayoutDashboard,
  enrollment: ClipboardList,
  students: UsersRound,
  classes: Building2,
  family: UserRound,
  contracts: FileSignature,
  billing: WalletCards
};

export function AppSidebar({
  badge,
  navItems,
  profileName
}: {
  badge: string;
  navItems: AppSidebarNavItem[];
  profileName: string;
}) {
  const groups = Array.from(new Set(navItems.map((item) => item.group ?? "Principal")));
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
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
        {groups.map((group) => <SidebarGroup key={group}>
          <SidebarGroupLabel>{group}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter((item) => (item.group ?? "Principal") === group).map((item) => {
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
        </SidebarGroup>)}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
          <Avatar size="sm"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{profileName}</p><p className="text-xs text-muted-foreground">{badge}</p></div>
          <div className="group-data-[collapsible=icon]:hidden"><LogoutButton compact /></div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
