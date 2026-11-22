"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCheck, ChevronRight, RefreshCw } from "@/components/ui/icons";
import { toast } from "sonner";
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

function DropdownLoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border/60">
      {Array.from({ length: 3 }, (_, idx) => (
        <div key={idx} className="flex items-start gap-2.5 px-3 py-2.5">
          <Skeleton className="size-7 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">Carregando avisos…</span>
    </div>
  );
}

export function NotificationPopoverContent({
  open,
  onClose,
  initialItems,
  onCountChange,
}: {
  open: boolean;
  onClose: () => void;
  initialItems?: InboxItem[];
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems ?? []);
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
          onCountChange?.(data.items.filter((item) => !item.recipient.read_at).length);
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
  }, [open, reloadToken, onCountChange]);

  const unreadCount = items.filter((item) => !item.recipient.read_at).length;

  const handleClearAll = async () => {
    if (unreadCount === 0) return;
    const previous = items;
    const now = new Date().toISOString();
    const cleared = items.map((item) => ({
      ...item,
      recipient: { ...item.recipient, read_at: item.recipient.read_at ?? now },
    }));
    setItems(cleared);
    onCountChange?.(0);

    try {
      const response = await fetch("/api/notifications/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
        keepalive: true,
      });
      if (!response.ok) throw new Error("failed");
      window.dispatchEvent(new Event("notifications:changed"));
    } catch {
      setItems(previous);
      onCountChange?.(previous.filter((item) => !item.recipient.read_at).length);
      toast.error("Não foi possível limpar os avisos.");
    }
  };

  return (
    <div className="flex flex-col bg-popover text-popover-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Avisos</h2>
          {!loading && !error && unreadCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary-text tabular-nums">
              {unreadCount}
            </span>
          ) : null}
        </div>
        {!loading && !error && unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Limpar tudo
          </button>
        ) : null}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {error ? (
          <div className="p-3">
            <Alert role="alert" variant="destructive" className="rounded-xl">
              <AlertDescription className="space-y-2.5">
                <p className="text-xs">
                  Não foi possível atualizar os avisos.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => {
                    setLoading(true);
                    setError(false);
                    setReloadToken((value) => value + 1);
                  }}
                >
                  <RefreshCw className="size-3" aria-hidden="true" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : loading ? (
          <DropdownLoadingSkeleton />
        ) : (
          <NotificationInbox
            key={JSON.stringify(items)}
            items={items}
            compact
            hideHeaderAction
            onNavigate={onClose}
            onItemsChange={(next) => {
              setItems(next);
              onCountChange?.(next.filter((item) => !item.recipient.read_at).length);
            }}
          />
        )}
      </div>

      <div className="border-t border-border/60 px-2 py-1.5">
        <Link
          href="/avisos"
          onClick={onClose}
          className="flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Ver central de avisos</span>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** Mantido para compatibilidade: renderiza o mesmo conteúdo compacto dentro de Sheet quando invocado diretamente. */
export function NotificationDrawer({
  open,
  onOpenChange,
  initialItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems?: InboxItem[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 border-l border-border/70 bg-background p-0 sm:max-w-sm">
        <SheetHeader className="sr-only">
          <SheetTitle>Avisos</SheetTitle>
          <SheetDescription>Pendências e comunicados da academia</SheetDescription>
        </SheetHeader>
        <NotificationPopoverContent
          open={open}
          onClose={() => onOpenChange(false)}
          initialItems={initialItems}
        />
      </SheetContent>
    </Sheet>
  );
}
