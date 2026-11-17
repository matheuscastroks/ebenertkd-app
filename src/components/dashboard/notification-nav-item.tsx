"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NotificationDrawer } from "@/features/notifications/components/notification-drawer";

const BellIcon = NAV_ICONS.notifications;

export function NotificationNavItem({ initialCount, active }: { initialCount: number; active?: boolean }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener("notifications:open-drawer", handleOpen);
    return () => window.removeEventListener("notifications:open-drawer", handleOpen);
  }, []);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { count?: number };
        if (!mounted || typeof payload.count !== "number") return;
        setCount(payload.count);
      } catch {
        // Keep the last known count if the device is offline.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("notifications:changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("notifications:changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          onClick={() => setDrawerOpen(true)}
          isActive={drawerOpen || active}
          tooltip={count ? `Avisos · ${count} não lidos` : "Avisos"}
          aria-label={count ? `Avisos, ${count} não lidos` : "Avisos"}
        >
          <span className="relative shrink-0">
            <BellIcon size={16} strokeWidth={2} aria-hidden="true" className="flex" />
            {count > 0 ? (
              <span
                className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span>Avisos</span>
        </SidebarMenuButton>
        {count > 0 ? <SidebarMenuBadge>{count > 99 ? "99+" : count}</SidebarMenuBadge> : null}
      </SidebarMenuItem>
      <NotificationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
