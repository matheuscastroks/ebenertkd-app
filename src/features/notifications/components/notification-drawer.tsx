"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationInbox } from "./notification-inbox";
import type { InboxItem } from "../types";

function DrawerLoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {Array.from({ length: 3 }, (_, idx) => (
          <div key={idx} className="flex items-start gap-3 p-4">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3.5 w-full" />
            </div>
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
      <SheetContent className="flex h-full w-full flex-col gap-0 border-l border-border/70 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 bg-background/85 px-5 pb-3.5 pt-5 pr-12 text-left backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <SheetTitle className="font-display text-xl font-semibold tracking-tight text-foreground">
                Avisos
              </SheetTitle>
              {!loading && !error ? (
                unreadCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-medium text-primary-text tabular-nums">
                    {unreadCount} novo{unreadCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    Tudo em dia
                  </span>
                )
              ) : null}
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Comunicados, lembretes e atualizações da academia
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/25 px-4 py-4">
          {error ? (
            <Alert role="alert" variant="destructive" className="rounded-2xl">
              <AlertDescription className="space-y-3">
                <p>
                  Não foi possível atualizar os avisos. Tente novamente ao abrir este painel.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-10 rounded-xl"
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

        <div className="border-t border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-md">
          <Link
            href="/avisos"
            onClick={() => onOpenChange(false)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Abrir central completa</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
