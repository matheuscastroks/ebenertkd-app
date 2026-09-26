import Link from "next/link";
import Image from "next/image";
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
  SidebarRail,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { NotificationNavItem } from "@/components/dashboard/notification-nav-item";
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
  if (item.icon === "notifications") return <NotificationNavItem initialCount={item.badge ?? 0} active={item.active} />;
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pb-5 pt-6">
        <div className="flex items-center gap-2">
          <Image src="/brand-icon.png" alt="Símbolo da Ebener TKD" width={44} height={44} unoptimized className="size-11 shrink-0 object-contain group-data-[collapsible=icon]:size-6" />
          <div className="min-w-0 flex-1 space-y-1 group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-bold tracking-wide">Ebener TKD</p>
            <p className="text-xs text-muted-foreground">Sua academia</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, index) => <div key={group}>{index > 0 ? <SidebarSeparator /> : null}<SidebarGroup>
          <SidebarGroupLabel>{group}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter((item) => (item.group ?? "Principal") === group).map((item) => <NavigationItem key={item.href} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup></div>)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <AccountMenu name={profileName} badge={badge} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
