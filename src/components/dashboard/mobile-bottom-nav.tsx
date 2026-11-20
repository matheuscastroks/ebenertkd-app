"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@/components/ui/icons";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import { useSidebar } from "@/components/ui/sidebar";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { resolveNavLocation } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";

const HOME_PATHS = ["/admin", "/aluno", "/responsavel"];
// Usado só quando nenhum item vem marcado com `bottomNav` (chamadas antigas).
const FALLBACK_ICONS: Array<keyof typeof NAV_ICONS> = ["attendance", "classes", "billing", "family", "students", "enrollment"];
const MAX_MIDDLE_TABS = 2;

type TabIconComponent = ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type BottomTab = {
  key: string;
  label: string;
  href?: string;
  icon: TabIconComponent;
  badge?: number;
  active?: boolean;
};

function pickMiddleItems(navItems: AppSidebarNavItem[], excluded: Set<string>) {
  const eligible = navItems.filter((item) => !excluded.has(item.href));
  const flagged = eligible.filter((item) => item.bottomNav);
  if (flagged.length) return flagged.slice(0, MAX_MIDDLE_TABS);
  const picked: AppSidebarNavItem[] = [];
  for (const icon of FALLBACK_ICONS) {
    if (picked.length >= MAX_MIDDLE_TABS) break;
    const found = eligible.find((item) => item.icon === icon && !picked.includes(item));
    if (found) picked.push(found);
  }
  return picked;
}

/**
 * Barra inferior do mobile: a seção inicial do perfil (Hoje, Início ou Família), até dois destinos frequentes do perfil, Avisos e Menu.
 * O menu completo (sidebar em folha) continua acessível pelo último botão.
 */
export function MobileBottomNav({ navItems }: { navItems: AppSidebarNavItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const homeItem = navItems.find((item) => item.exact || HOME_PATHS.includes(item.href)) ?? navItems[0];
  const notificationsItem = navItems.find((item) => item.icon === "notifications");
  const middleItems = pickMiddleItems(
    navItems,
    new Set([homeItem?.href, notificationsItem?.href].filter((href): href is string => Boolean(href)))
  );

  const tabs: BottomTab[] = [];
  // A aba fica ativa em qualquer tela da seção, inclusive no detalhe em pilha.
  const { section } = resolveNavLocation(navItems, pathname);
  const isActive = (item: AppSidebarNavItem) => section === item || (!section && pathname === item.href);

  if (homeItem) {
    tabs.push({
      key: homeItem.href,
      label: homeItem.shortLabel ?? homeItem.label,
      href: homeItem.href,
      icon: NAV_ICONS[homeItem.icon ?? "dashboard"],
      active: isActive(homeItem)
    });
  }

  for (const item of middleItems) {
    tabs.push({
      key: item.href,
      label: item.shortLabel ?? item.label,
      href: item.href,
      icon: NAV_ICONS[item.icon ?? "dashboard"],
      badge: item.badge,
      active: isActive(item)
    });
  }

  if (notificationsItem) {
    tabs.push({
      key: notificationsItem.href,
      label: "Avisos",
      href: notificationsItem.href,
      icon: NAV_ICONS.notifications,
      badge: notificationsItem.badge,
      active: pathname === notificationsItem.href || pathname.startsWith(`${notificationsItem.href}/`)
    });
  }

  const itemClass = "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1.5 touch-manipulation transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  function renderContent(tab: BottomTab) {
    const Icon = tab.icon;
    return (
      <>
        <span className="relative">
          <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
          {tab.badge && tab.badge > 0 ? (
            <span
              className="t-badge-pop absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold leading-none text-destructive-foreground tabular-nums"
              aria-label={`${tab.badge} notificações`}
            >
              {tab.badge > 9 ? "9+" : tab.badge}
            </span>
          ) : null}
        </span>
        <span className="whitespace-nowrap text-xs leading-4">{tab.label}</span>
      </>
    );
  }

  return (
    <nav
      aria-label="Navegação móvel principal"
      className="fixed inset-x-0 bottom-0 z-40 block border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16 items-stretch px-1 py-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href!}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              itemClass,
              tab.active ? "font-semibold text-primary-text" : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            {renderContent(tab)}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Abrir menu completo"
          className={cn(itemClass, "font-medium text-muted-foreground hover:text-foreground")}
        >
          {renderContent({ key: "menu", label: "Menu", icon: Menu })}
        </button>
      </div>
    </nav>
  );
}
