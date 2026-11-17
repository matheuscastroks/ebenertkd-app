import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
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
  useSidebar
} from "@/components/ui/sidebar";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { NotificationNavItem } from "@/components/dashboard/notification-nav-item";
import type { SidebarNavItem } from "@/lib/navigation/routes";

export type AppSidebarNavItem = SidebarNavItem;

function NavigationItem({ item }: { item: AppSidebarNavItem }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = NAV_ICONS[item.icon ?? "dashboard"];
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (item.icon === "notifications") {
    return (
      <div onClick={handleNavClick}>
        <NotificationNavItem initialCount={item.badge ?? 0} active={item.active} />
      </div>
    );
  }

  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
          <Link href={item.href} onClick={handleNavClick}>
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {item.badge ? (
          <SidebarMenuBadge aria-label={`${item.badge} pendente${item.badge === 1 ? "" : "s"}`}>
            {item.badge}
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      key={`${item.href}-${item.active}`}
      asChild
      defaultOpen={item.active}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
          <Link href={item.href} onClick={handleNavClick}>
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction aria-label={`Alternar submenu de ${item.label}`}>
            <ChevronRight
              aria-hidden="true"
              className="transition-transform duration-200 motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90"
            />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton asChild isActive={child.active}>
                  <Link href={child.href} onClick={handleNavClick}>
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  badge,
  navItems,
  profileName,
  profileEmail,
  role,
  avatarUrl
}: {
  badge: string;
  navItems: AppSidebarNavItem[];
  profileName: string;
  profileEmail?: string;
  role?: string;
  avatarUrl?: string;
}) {
  const groups = Array.from(new Set(navItems.map((item) => item.group ?? "Principal")));
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <Image src="/brand-icon.png" alt="" width={36} height={36} unoptimized className="size-9 shrink-0 object-contain group-data-[collapsible=icon]:size-6" />
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-semibold leading-5">Ebener TKD</p>
            <p className="text-xs leading-4 text-muted-foreground">{badge}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {groups.map((group, index) => {
          const items = navItems.filter((item) => (item.group ?? "Principal") === group);
          // O primeiro grupo abre a navegação: o rótulo fica só para leitores de tela.
          const labelHidden = index === 0 && group === "Principal";
          return (
            <SidebarGroup key={group} role="group" aria-label={group} className="py-1.5">
              <SidebarGroupLabel className={labelHidden ? "sr-only" : undefined}>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => <NavigationItem key={item.href} item={item} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <AccountMenu
          name={profileName}
          badge={badge}
          email={profileEmail}
          role={role}
          avatarUrl={avatarUrl}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
