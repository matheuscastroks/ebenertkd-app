"use client";

import { usePathname } from "next/navigation";
import { AppSidebar, type AppSidebarNavItem } from "@/components/dashboard/app-sidebar";

const rootPaths = new Set(["/admin", "/aluno", "/responsavel"]);

function activateItem(item: AppSidebarNavItem, pathname: string): AppSidebarNavItem {
  const children = item.children?.map((child) => activateItem(child, pathname));
  const exact = item.exact ?? rootPaths.has(item.href);
  const selfActive = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return { ...item, children, active: selfActive || Boolean(children?.some((child) => child.active)) };
}

export function ActiveSidebar({ badge, navItems, profileName }: { badge: string; navItems: AppSidebarNavItem[]; profileName: string }) {
  const pathname = usePathname();
  const items = navItems.map((item) => activateItem(item, pathname));
  return <AppSidebar badge={badge} navItems={items} profileName={profileName} />;
}
