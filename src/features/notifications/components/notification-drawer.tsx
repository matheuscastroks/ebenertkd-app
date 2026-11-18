"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { BellIcon } from "@/components/ui/bell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationInbox } from "./notification-inbox";
import type { InboxItem } from "../types";

function DrawerLoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 3 }, (_, idx) => (
          <div key={idx} className="space-y-2.5 p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando avisos…</span>
    </div>
  );
}

export function NotificationDrawer({
  open,
  onOpenChange,
  initialItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems?: InboxItem[];
}) {
  const [items, setItems] = useState(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/notifications/inbox", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = (await response.json()) as { items?: InboxItem[] };
        if (!Array.isArray(data.items)) throw new Error("invalid");
        if (mounted) {
          setItems(data.items);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    window.addEventListener("notifications:changed", load);
    return () => {
      mounted = false;
      window.removeEventListener("notifications:changed", load);
    };
  }, [open, reloadToken]);

  const unreadCount = items.filter((item) => !item.recipient.read_at).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border bg-card px-5 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
              <BellIcon size={18} strokeWidth={2} aria-hidden="true" />
              <span
                className="t-badge"
                data-open={!loading && !error && unreadCount > 0 ? "true" : "false"}
                aria-hidden="true"
              >
                <span className="t-badge-dot flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-4 text-primary-foreground tabular-nums shadow-xs">
                  {unreadCount > 99 ? "99+" : Math.max(1, unreadCount)}
                </span>
              </span>
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-base font-semibold">Avisos</SheetTitle>
                {!loading && !error ? (
                  <StatusBadge tone={unreadCount > 0 ? "info" : "success"}>
                    {unreadCount > 0
                      ? `${unreadCount} não lido${unreadCount === 1 ? "" : "s"}`
                      : "Tudo em dia"}
                  </StatusBadge>
                ) : null}
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Comunicados, lembretes e atualizações da academia
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-5 py-4">
          {error ? (
            <Alert role="alert" variant="destructive" className="space-y-3">
              <AlertDescription className="space-y-3">
                <p>Não foi possível atualizar os avisos. Tente novamente ao abrir este painel.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-10"
                  onClick={() => {
                    setLoading(true);
                    setError(false);
                    setReloadToken((value) => value + 1);
                  }}
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <DrawerLoadingSkeleton />
          ) : (
            <NotificationInbox
              key={JSON.stringify(items)}
              items={items}
              compact
              onNavigate={() => onOpenChange(false)}
            />
          )}
        </div>

        <div className="border-t border-border bg-card px-5 py-3.5">
          <Button asChild variant="outline" className="h-11 w-full justify-between">
            <Link href="/avisos" onClick={() => onOpenChange(false)}>
              <span>Abrir central completa</span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
