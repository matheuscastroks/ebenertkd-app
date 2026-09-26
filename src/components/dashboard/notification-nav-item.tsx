"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NotificationDrawer } from "@/features/notifications/components/notification-drawer";

export function NotificationNavItem({ initialCount, active }: { initialCount: number; active?: boolean }) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [animate, setAnimate] = useState(initialCount > 0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const previous = useRef(initialCount);

  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener("notifications:open-drawer", handleOpen);
    return () => window.removeEventListener("notifications:open-drawer", handleOpen);
  }, []);

  useEffect(() => {
    let mounted = true;
    let animationTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { count?: number };
        if (!mounted || typeof payload.count !== "number") return;
        if (payload.count > previous.current) {
          setAnimate(true);
          if (animationTimer) clearTimeout(animationTimer);
          animationTimer = setTimeout(() => setAnimate(false), 1600);
        }
        previous.current = payload.count;
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
    const initialAnimationTimer = setTimeout(() => setAnimate(false), 1600);
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(initialAnimationTimer);
      if (animationTimer) clearTimeout(animationTimer);
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
            <Bell
              aria-hidden="true"
              className={`size-4 ${animate && count ? "notification-bell-nudge" : ""}`}
            />
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
