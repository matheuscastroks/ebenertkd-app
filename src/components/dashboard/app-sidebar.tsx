"use client";

import { useAcademyBrand } from "@/components/academy-config-provider";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import type { AnimatedIconHandle } from "@/lib/use-parent-hover-animation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { AccountMenu } from "@/components/dashboard/account-menu";
import type { SidebarNavItem } from "@/lib/navigation/routes";

export type AppSidebarNavItem = SidebarNavItem;

function NavigationItem({ item }: { item: AppSidebarNavItem }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = NAV_ICONS[item.icon ?? "dashboard"];
  const iconRef = useRef<AnimatedIconHandle>(null);
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Um nível só (HIG): as subtelas da seção aparecem como segmentos dentro da própria tela.
  return (
    <SidebarMenuItem
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
        <Link href={item.href} onClick={handleNavClick} aria-current={item.active ? "page" : undefined}>
          <Icon ref={iconRef} aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
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

export function AppSidebar({
  badge,
  navItems,
  profileName,
  profileEmail,
  role,
  avatarUrl,
  avatarSex
}: {
  badge: string;
  navItems: AppSidebarNavItem[];
  profileName: string;
  profileEmail?: string;
  role?: string;
  avatarUrl?: string;
  avatarSex?: "feminino" | "masculino" | null;
}) {
  const { shortName } = useAcademyBrand();
  const sidebarItems = navItems.filter((item) => item.icon !== "notifications" && item.group !== "Rodapé");
  const footerItems = navItems.filter((item) => item.group === "Rodapé");
  const groups = Array.from(new Set(sidebarItems.map((item) => item.group ?? "Principal")));
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="px-3 pb-2 pt-4 group-data-[mobile=true]/mobile-sidebar:px-4 group-data-[mobile=true]/mobile-sidebar:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <Image src="/brand-icon.png" alt="" width={36} height={36} unoptimized className="size-9 shrink-0 object-contain group-data-[mobile=true]/mobile-sidebar:size-11" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold leading-5 group-data-[mobile=true]/mobile-sidebar:text-base">{shortName}</p>
            <p className="text-xs leading-4 text-muted-foreground group-data-[mobile=true]/mobile-sidebar:text-sm group-data-[mobile=true]/mobile-sidebar:leading-5">{badge}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {groups.map((group, index) => {
          const items = sidebarItems.filter((item) => (item.group ?? "Principal") === group);
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

      <SidebarFooter className="group-data-[mobile=true]/mobile-sidebar:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {footerItems.length ? (
          <SidebarMenu>
            {footerItems.map((item) => <NavigationItem key={item.href} item={item} />)}
          </SidebarMenu>
        ) : null}
        <AccountMenu
          name={profileName}
          badge={badge}
          email={profileEmail}
          role={role}
          avatarUrl={avatarUrl}
          avatarSex={avatarSex}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
