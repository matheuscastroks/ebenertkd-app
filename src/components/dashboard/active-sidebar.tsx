"use client";

import { usePathname } from "next/navigation";
import { AppSidebar, type AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import { resolveNavLocation } from "@/lib/navigation/routes";

export function ActiveSidebar({
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
  const pathname = usePathname();
  // A seção fica ativa em qualquer tela dela, inclusive nas telas de detalhe em pilha.
  const { section } = resolveNavLocation(navItems, pathname);
  const items = navItems.map((item) => ({ ...item, active: item === section }));
  return (
    <AppSidebar
      badge={badge}
      navItems={items}
      profileName={profileName}
      profileEmail={profileEmail}
      role={role}
      avatarUrl={avatarUrl}
    />
  );
}
