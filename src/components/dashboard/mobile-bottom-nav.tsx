"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  Bell,
  Building2,
  CalendarCheck2,
  ClipboardList,
  FileSignature,
  LayoutDashboard,
  Menu,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import type { SidebarNavIcon } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";

const navIcons: Record<SidebarNavIcon, LucideIcon> = {
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

export function MobileBottomNav({ navItems }: { navItems: AppSidebarNavItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  // 1. Identificar o item inicial (Home)
  const homeItem = navItems.find((i) => i.exact || ["/admin", "/aluno", "/responsavel"].includes(i.href)) ?? navItems[0];

  // 2. Identificar avisos/notificações
  const notificationsItem = navItems.find((i) => i.icon === "notifications");

  // 3. Identificar os itens centrais mais relevantes (treino, financeiro, turmas, alunos, dependentes)
  const candidateIcons: Array<keyof typeof navIcons> = [
    "attendance",
    "classes",
    "billing",
    "family",
    "students",
    "enrollment"
  ];

  const middleItems: AppSidebarNavItem[] = [];
  for (const icon of candidateIcons) {
    if (middleItems.length >= 2) break;
    const found = navItems.find(
      (item) => item.icon === icon && item.href !== homeItem?.href && item.href !== notificationsItem?.href
    );
    if (found && !middleItems.some((m) => m.href === found.href)) {
      middleItems.push(found);
    }
  }

  // 4. Montar a lista final com até 5 itens (Home + 2 principais + Avisos + Menu)
  const bottomTabs: Array<{
    label: string;
    href?: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    active?: boolean;
    isMenuTrigger?: boolean;
  }> = [];

  if (homeItem) {
    const Icon = navIcons[homeItem.icon ?? "dashboard"] ?? LayoutDashboard;
    const isHomeActive = homeItem.exact
      ? pathname === homeItem.href
      : pathname === homeItem.href || pathname.startsWith(`${homeItem.href}/`);
    bottomTabs.push({
      label: "Início",
      href: homeItem.href,
      icon: Icon,
      active: isHomeActive && !middleItems.some((m) => pathname.startsWith(m.href)) && pathname !== "/avisos"
    });
  }

  for (const item of middleItems) {
    const Icon = navIcons[item.icon ?? "dashboard"] ?? LayoutDashboard;
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    bottomTabs.push({
      label: item.label.split(" ")[0], // rótulo conciso
      href: item.href,
      icon: Icon,
      badge: item.badge,
      active: isActive
    });
  }

  if (notificationsItem) {
    bottomTabs.push({
      label: "Avisos",
      href: notificationsItem.href,
      icon: Bell,
      badge: notificationsItem.badge,
      active: pathname.startsWith(notificationsItem.href)
    });
  }

  // Último item: Ação para abrir a barra lateral completa
  bottomTabs.push({
    label: "Menu",
    icon: Menu,
    isMenuTrigger: true
  });

  return (
    <nav
      aria-label="Navegação móvel principal"
      className="fixed inset-x-0 bottom-0 z-40 block border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-md md:hidden"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {bottomTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const content = (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 transition-colors",
                tab.active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className="relative">
                <Icon className={cn("size-5", tab.active ? "stroke-[2.5]" : "stroke-2")} aria-hidden="true" />
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50"
                    aria-label={`${tab.badge} notificações`}
                  >
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {tab.active ? (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-primary" aria-hidden="true" />
              ) : null}
            </div>
          );

          if (tab.isMenuTrigger) {
            return (
              <button
                key={`tab-menu-${idx}`}
                type="button"
                onClick={() => setOpenMobile(true)}
                className="flex flex-1 items-center justify-center touch-manipulation"
                aria-label="Abrir menu completo"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className="flex flex-1 items-center justify-center touch-manipulation"
              aria-current={tab.active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
