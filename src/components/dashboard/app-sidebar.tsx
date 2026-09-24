import Link from "next/link";
import { Activity, Award, Bell, Building2, CalendarCheck2, ChevronRight, ClipboardList, FileSignature, LayoutDashboard, UserRound, UsersRound, WalletCards } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { SidebarNavItem } from "@/lib/navigation/routes";

export type AppSidebarNavItem = SidebarNavItem;

const navIcons = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  enrollment: ClipboardList,
  students: UsersRound,
  classes: Building2,
  exams: Award,
  attendance: CalendarCheck2,
  family: UserRound,
  contracts: FileSignature,
  billing: WalletCards,
  system: Activity
};

function NavigationItem({ item }: { item: AppSidebarNavItem }) {
  const Icon = navIcons[item.icon ?? "dashboard"];
  if (!item.children?.length) return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
        <Link href={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>
      </SidebarMenuButton>
      {item.badge ? <SidebarMenuBadge aria-label={`${item.badge} pendente${item.badge === 1 ? "" : "s"}`}>{item.badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );

  return (
    <Collapsible key={`${item.href}-${item.active}`} asChild defaultOpen={item.active} className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
          <Link href={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction aria-label={`Alternar submenu de ${item.label}`}>
            <ChevronRight aria-hidden="true" className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => <SidebarMenuSubItem key={child.href}><SidebarMenuSubButton asChild isActive={child.active}><Link href={child.href}><span>{child.label}</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>)}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

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
              {navItems.filter((item) => (item.group ?? "Principal") === group).map((item) => <NavigationItem key={item.href} item={item} />)}
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
