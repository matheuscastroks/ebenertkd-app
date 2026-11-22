"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import type { AnimatedIconHandle } from "@/lib/use-parent-hover-animation";
import { NotificationPopoverContent } from "@/features/notifications/components/notification-drawer";
import { cn } from "@/lib/utils";

const BellIcon = NAV_ICONS.notifications;

const NotificationCountContext = createContext<number | undefined>(undefined);

export function NotificationCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  return (
    <NotificationCountContext.Provider value={initialCount}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function NotificationHeaderButton({
  initialCount,
  className,
}: {
  initialCount?: number;
  className?: string;
}) {
  const contextCount = useContext(NotificationCountContext);
  const resolvedInitialCount = initialCount ?? contextCount ?? 0;

  const [count, setCount] = useState(resolvedInitialCount);
  const [displayCount, setDisplayCount] = useState(Math.max(1, resolvedInitialCount));
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  const syncCount = useCallback((nextCount: number) => {
    countRef.current = nextCount;
    setCount(nextCount);
    if (nextCount > 0) {
      setDisplayCount(nextCount);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (resolvedInitialCount > countRef.current && resolvedInitialCount > 0) {
        pulseBell();
      }
      syncCount(resolvedInitialCount);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resolvedInitialCount, pulseBell, syncCount]);

  useEffect(() => {
    const handleOpen = () => setPopoverOpen(true);
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
        }
        syncCount(payload.count);
      } catch {
        // Mantém a última contagem conhecida se o dispositivo estiver offline.
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
  }, [pulseBell, syncCount]);

  const hasUnread = count > 0;
  const formattedCount = displayCount > 99 ? "99+" : String(displayCount);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => bellIconRef.current?.startAnimation()}
          onMouseLeave={() => bellIconRef.current?.stopAnimation()}
          aria-label={hasUnread ? `Avisos, ${count} não lidos` : "Avisos"}
          aria-expanded={popoverOpen}
          title={hasUnread ? `Avisos · ${count} não lidos` : "Avisos"}
          className={cn(
            "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-sidebar-border/80 bg-background/80 text-sidebar-foreground shadow-xs transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
            popoverOpen && "border-primary/40 bg-background text-primary-text",
            className
          )}
        >
          <BellIcon
            ref={bellIconRef}
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className="flex size-4.5"
          />
          <span
            className="t-badge pointer-events-none absolute -right-1 -top-1"
            data-open={hasUnread ? "true" : "false"}
            aria-hidden="true"
          >
            <span className="t-badge-dot flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-none text-primary-foreground tabular-nums shadow-xs ring-2 ring-sidebar select-none text-center">
              {formattedCount}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 overflow-hidden rounded-xl p-0 shadow-md ring-1 ring-border/70 sm:w-96"
      >
        <NotificationPopoverContent
          open={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          onCountChange={syncCount}
        />
      </PopoverContent>
    </Popover>
  );
}

export { NotificationHeaderButton as NotificationTopButton };
