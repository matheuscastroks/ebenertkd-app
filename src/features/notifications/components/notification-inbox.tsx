"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onNavigate,
}: {
  items: InboxItem[];
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"unread" | "history">("unread");
  const [kindFilter, setKindFilter] = useState<"all" | NotificationKind>("all");
  const marking = useRef(new Set<string>());
  const [, startTransition] = useTransition();

  const unreadItems = useMemo(() => {
    return items
      .filter((item) => !item.recipient.read_at)
      .filter((item) => kindFilter === "all" || item.notification.kind === kindFilter);
  }, [items, kindFilter]);

  const historyItems = useMemo(() => {
    return items
      .filter((item) => Boolean(item.recipient.read_at))
      .filter((item) => kindFilter === "all" || item.notification.kind === kindFilter);
  }, [items, kindFilter]);

  const totalUnread = items.filter((item) => !item.recipient.read_at).length;
  const totalHistory = items.filter((item) => Boolean(item.recipient.read_at)).length;

  const handleMarkAsRead = async (recipientId: string) => {
    if (marking.current.has(recipientId)) return;
    marking.current.add(recipientId);

    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) =>
        item.recipient.$id === recipientId
          ? { ...item, recipient: { ...item.recipient, read_at: now } }
          : item
      )
    );

    try {
      const response = await fetch("/api/notifications/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: recipientId }),
      });
      if (!response.ok) throw new Error("failed");
      window.dispatchEvent(new Event("notifications:changed"));
      toast.success("Aviso movido para o histórico.");
    } catch {
      toast.error("Não foi possível marcar o aviso como lido", {
        description: "Tente novamente em instantes.",
      });
      setItems((prev) =>
        prev.map((item) =>
          item.recipient.$id === recipientId
            ? { ...item, recipient: { ...item.recipient, read_at: null } }
            : item
        )
      );
    } finally {
      marking.current.delete(recipientId);
    }
  };

  const handleMarkAllRead = async () => {
    if (totalUnread === 0) return;
    const previousItems = items;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) => ({
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
        });
        if (!response.ok) throw new Error("failed");
        window.dispatchEvent(new Event("notifications:changed"));
        toast.success("Todos os avisos foram movidos para o histórico.");
      } catch {
        setItems(previousItems);
        toast.error("Erro ao marcar avisos como lidos.");
      }
    });
  };

  const availableKinds = useMemo(
    () => new Set(items.map((item) => item.notification.kind)),
    [items]
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

  const renderList = (entries: InboxItem[], empty: { title: string; hint: string }) =>
    entries.length ? (
      <div className="t-stagger space-y-2.5">
        {entries.map((item) => (
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
      <div className="t-panel-enter flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
          <BellOff className="size-5 stroke-[1.75]" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{empty.title}</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {empty.hint}
          </p>
        </div>
      </div>
    );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "unread" | "history")}
      className="space-y-3.5"
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList
            className={cn(
              "grid h-auto grid-cols-2 rounded-xl bg-muted/80 p-1",
              compact ? "w-full" : "w-full sm:w-auto sm:min-w-64"
            )}
            aria-label="Caixa de avisos"
          >
            <TabsTrigger
              value="unread"
              className="min-h-11 rounded-lg px-4 text-sm font-medium tabular-nums"
            >
              Novos ({totalUnread})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="min-h-11 rounded-lg px-4 text-sm font-medium tabular-nums"
            >
              Histórico ({totalHistory})
            </TabsTrigger>
          </TabsList>

          {!compact && totalUnread > 1 && activeTab === "unread" ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Marcar todos como lidos
            </button>
          ) : null}
        </div>

        {availableKinds.size > 1 ||
        kindFilter !== "all" ||
        (compact && totalUnread > 1 && activeTab === "unread") ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {availableKinds.size > 1 || kindFilter !== "all" ? (
              <div
                role="group"
                aria-label="Filtrar por tipo de aviso"
                className="flex flex-wrap items-center gap-1.5"
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
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-(--duration-quick) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "bg-foreground text-background shadow-xs"
                          : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground"
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

            {compact && totalUnread > 1 && activeTab === "unread" ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Ler todos
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <TabsContent value="unread" className="mt-0">
        {renderList(unreadItems, {
          title: "Nenhum aviso novo",
          hint: "Avisos lidos ficam no Histórico.",
        })}
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        {renderList(historyItems, {
          title: "Histórico vazio",
          hint: "Os avisos aparecem aqui depois de lidos.",
        })}
      </TabsContent>
    </Tabs>
  );
}
