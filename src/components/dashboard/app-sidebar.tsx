"use client";

import { useAcademyBrand } from "@/components/academy-config-provider";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronRightIcon, type ChevronRightIconHandle } from "@/components/ui/chevron-right";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import type { AnimatedIconHandle } from "@/lib/use-parent-hover-animation";
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
  useSidebar
} from "@/components/ui/sidebar";
import { AccountMenu } from "@/components/dashboard/account-menu";
import type { SidebarNavItem } from "@/lib/navigation/routes";

export type AppSidebarNavItem = SidebarNavItem;

function NavigationItem({ item }: { item: AppSidebarNavItem }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = NAV_ICONS[item.icon ?? "dashboard"];
  const iconRef = useRef<AnimatedIconHandle>(null);
  const chevronRef = useRef<ChevronRightIconHandle>(null);
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const startIconAnimation = () => iconRef.current?.startAnimation();
  const stopIconAnimation = () => iconRef.current?.stopAnimation();

  if (!item.children?.length) {
    return (
      <SidebarMenuItem onMouseEnter={startIconAnimation} onMouseLeave={stopIconAnimation}>
        <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
          <Link href={item.href} onClick={handleNavClick}>
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

  return (
    <Collapsible
      key={`${item.href}-${item.active}`}
      asChild
      defaultOpen={item.active}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={item.active}
          tooltip={item.label}
          onMouseEnter={startIconAnimation}
          onMouseLeave={stopIconAnimation}
        >
          <Link href={item.href} onClick={handleNavClick}>
            <Icon ref={iconRef} aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            aria-label={`Alternar submenu de ${item.label}`}
            onMouseEnter={() => {
              startIconAnimation();
              chevronRef.current?.startAnimation();
            }}
            onMouseLeave={() => {
              stopIconAnimation();
              chevronRef.current?.stopAnimation();
            }}
          >
            <ChevronRightIcon
              ref={chevronRef}
              aria-hidden="true"
              className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90"
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
  const { shortName } = useAcademyBrand();
  const sidebarItems = navItems.filter((item) => item.icon !== "notifications");
  const groups = Array.from(new Set(sidebarItems.map((item) => item.group ?? "Principal")));
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <Image src="/brand-icon.png" alt="" width={36} height={36} unoptimized className="size-9 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold leading-5">{shortName}</p>
            <p className="text-xs leading-4 text-muted-foreground">{badge}</p>
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

      <SidebarFooter>
        <AccountMenu
          name={profileName}
          badge={badge}
          email={profileEmail}
          role={role}
          avatarUrl={avatarUrl}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
