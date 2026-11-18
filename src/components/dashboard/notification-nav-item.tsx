"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import type { AnimatedIconHandle } from "@/lib/use-parent-hover-animation";
import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NotificationDrawer } from "@/features/notifications/components/notification-drawer";

const BellIcon = NAV_ICONS.notifications;

export function NotificationNavItem({ initialCount, active }: { initialCount: number; active?: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [displayCount, setDisplayCount] = useState(Math.max(1, initialCount));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const countRef = useRef(count);
  const bellIconRef = useRef<AnimatedIconHandle>(null);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const pulseBell = useCallback(() => {
    bellIconRef.current?.startAnimation();
    window.setTimeout(() => {
      bellIconRef.current?.stopAnimation();
    }, 650);
  }, []);

  const notifyUnreadToast = useCallback((unreadCount: number) => {
    if (unreadCount <= 0) return;
    const key = "ebener:unread-toast-shown";
    try {
      if (sessionStorage.getItem(key) === String(unreadCount)) return;
      sessionStorage.setItem(key, String(unreadCount));
    } catch {
      // Ignore storage access errors in restricted browsing contexts.
    }
    toast(
      unreadCount === 1
        ? "Você tem 1 novo aviso"
        : `Você tem ${unreadCount} avisos não lidos`,
      {
        id: "unread-notifications",
        description: "Toque em Ver para abrir a central de comunicados.",
        action: { label: "Ver", onClick: () => setDrawerOpen(true) },
      }
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCount(initialCount);
      if (initialCount > 0) {
        setDisplayCount(initialCount);
        pulseBell();
        notifyUnreadToast(initialCount);
      }
      countRef.current = initialCount;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCount, notifyUnreadToast, pulseBell]);

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
        if (payload.count > countRef.current) {
          pulseBell();
          notifyUnreadToast(payload.count);
        } else if (payload.count < countRef.current) {
          try {
            const key = "ebener:unread-toast-shown";
            if (payload.count <= 0) {
              sessionStorage.removeItem(key);
            } else {
              sessionStorage.setItem(key, String(payload.count));
            }
          } catch {
            // Ignore storage access errors.
          }
        }
        countRef.current = payload.count;
        setCount(payload.count);
        if (payload.count > 0) {
          setDisplayCount(payload.count);
        }
      } catch {
        // Keep the last known count if the device is offline.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
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
  }, [notifyUnreadToast, pulseBell]);

  const hasUnread = count > 0;
  const formattedCount = displayCount > 99 ? "99+" : String(displayCount);

  return (
    <>
      <SidebarMenuItem
        onMouseEnter={() => bellIconRef.current?.startAnimation()}
        onMouseLeave={() => bellIconRef.current?.stopAnimation()}
      >
        <SidebarMenuButton
          type="button"
          onClick={() => setDrawerOpen(true)}
          isActive={drawerOpen || active}
          tooltip={hasUnread ? `Avisos · ${count} não lidos` : "Avisos"}
          aria-label={hasUnread ? `Avisos, ${count} não lidos` : "Avisos"}
        >
          <span className="relative inline-flex shrink-0 items-center justify-center">
            <BellIcon ref={bellIconRef} size={16} strokeWidth={2} aria-hidden="true" className="flex size-4" />
            <span
              className="t-badge"
              data-open={hasUnread ? "true" : "false"}
              aria-hidden="true"
            >
              <span className="t-badge-dot size-2 rounded-full bg-primary ring-2 ring-sidebar" />
            </span>
          </span>
          <span>Avisos</span>
        </SidebarMenuButton>
        {hasUnread ? (
          <SidebarMenuBadge className="t-badge-pop bg-primary/15 font-semibold text-primary-text tabular-nums">
            {formattedCount}
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
      <NotificationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
