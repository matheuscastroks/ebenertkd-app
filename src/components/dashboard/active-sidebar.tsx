"use client";

import { usePathname } from "next/navigation";
import { AppSidebar, type AppSidebarNavItem } from "@/components/dashboard/app-sidebar";

const rootPaths = new Set(["/admin", "/aluno", "/responsavel"]);

export function ActiveSidebar({ badge, navItems, profileName }: { badge: string; navItems: AppSidebarNavItem[]; profileName: string }) {
  const pathname = usePathname();
  const items = navItems.map((item) => ({
    ...item,
    active: pathname === item.href || (!rootPaths.has(item.href) && pathname.startsWith(`${item.href}/`))
  }));
  return <AppSidebar badge={badge} navItems={items} profileName={profileName} />;
}
