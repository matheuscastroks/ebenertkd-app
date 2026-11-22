"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCheck, CheckCircle2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./notification-item";
import type { InboxItem, NotificationKind } from "../types";

const KIND_FILTERS: Array<{ value: "all" | NotificationKind; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "announcement", label: "Avisos" },
  { value: "payment_reminder", label: "Financeiro" },
  { value: "system", label: "Sistema" },
];

export function NotificationInbox({
  items: initialItems,
  compact = false,
  hideHeaderAction = false,
  onNavigate,
  onItemsChange,
}: {
  items: InboxItem[];
  compact?: boolean;
  hideHeaderAction?: boolean;
  onNavigate?: () => void;
  onItemsChange?: (items: InboxItem[]) => void;
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [kindFilter, setKindFilter] = useState<"all" | NotificationKind>("all");
  const marking = useRef(new Set<string>());
  const [, startTransition] = useTransition();

  const unreadItems = useMemo(
    () => items.filter((item) => !item.recipient.read_at),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      unreadItems.filter(
        (item) => kindFilter === "all" || item.notification.kind === kindFilter
      ),
    [unreadItems, kindFilter]
  );

  const availableKinds = useMemo(
    () => new Set(unreadItems.map((item) => item.notification.kind)),
    [unreadItems]
  );

  const visibleFilters = useMemo(
    () =>
      KIND_FILTERS.filter(
        (filter) =>
          filter.value === "all" ||
          availableKinds.has(filter.value) ||
          kindFilter === filter.value
      ),
    [availableKinds, kindFilter]
  );

  const updateItems = (next: InboxItem[]) => {
    setItems(next);
    onItemsChange?.(next);
  };

  const handleMarkAsRead = async (recipientId: string) => {
    if (marking.current.has(recipientId)) return;
    marking.current.add(recipientId);

    const now = new Date().toISOString();
    const next = items.map((item) =>
      item.recipient.$id === recipientId
        ? { ...item, recipient: { ...item.recipient, read_at: now } }
        : item
    );
    updateItems(next);

    try {
      const response = await fetch("/api/notifications/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: recipientId }),
        keepalive: true,
      });
      if (!response.ok) throw new Error("failed");
      window.dispatchEvent(new Event("notifications:changed"));
    } catch {
      toast.error("Não foi possível atualizar o aviso", {
        description: "Tente novamente em instantes.",
      });
      const rolledBack = items.map((item) =>
        item.recipient.$id === recipientId
          ? { ...item, recipient: { ...item.recipient, read_at: null } }
          : item
      );
      updateItems(rolledBack);
    } finally {
      marking.current.delete(recipientId);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadItems.length === 0) return;
    const previousItems = items;
    const now = new Date().toISOString();
    updateItems(
      items.map((item) => ({
        ...item,
        recipient: { ...item.recipient, read_at: item.recipient.read_at ?? now },
      }))
    );

    startTransition(async () => {
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
        updateItems(previousItems);
        toast.error("Não foi possível limpar os avisos.");
      }
    });
  };

  const showFilterRow = availableKinds.size > 1 || kindFilter !== "all";
  const showInlineClear = !hideHeaderAction && unreadItems.length > 0;

  return (
    <div className={cn(compact ? "space-y-0" : "space-y-3")}>
      {showFilterRow || showInlineClear ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2",
            compact && "border-b border-border/60 px-3 py-2"
          )}
        >
          {showFilterRow ? (
            <div
              role="group"
              aria-label="Filtrar por tipo de aviso"
              className="flex flex-wrap items-center gap-1"
            >
              {visibleFilters.map((filter) => {
                const selected = kindFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setKindFilter(filter.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-(--duration-quick) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "bg-foreground text-background"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span />
          )}

          {showInlineClear ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Limpar tudo
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <div
          className={cn(
            "t-stagger divide-y divide-border/60",
            !compact && "overflow-hidden rounded-xl bg-card shadow-xs"
          )}
        >
          {visibleItems.map((item) => (
            <NotificationItem
              key={item.recipient.$id}
              notification={item}
              compact={compact}
              onMarkRead={handleMarkAsRead}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "t-panel-enter flex flex-col items-center justify-center gap-2 text-center",
            compact
              ? "px-4 py-8"
              : "rounded-xl bg-card px-6 py-12 shadow-xs"
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">Tudo em dia</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Nenhum aviso pendente no momento.
          </p>
        </div>
      )}
    </div>
  );
}
