"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationItem } from "./notification-item";
import type { InboxItem, NotificationKind } from "../types";

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

  const kinds = new Set(items.map((item) => item.notification.kind));
  const list = (entries: InboxItem[], empty: { title: string; hint: string }) =>
    entries.length ? (
      <div className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
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
      <div className="t-panel-enter flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-5 py-10 text-center shadow-xs">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{empty.title}</p>
          <p className="text-xs text-muted-foreground">{empty.hint}</p>
        </div>
      </div>
    );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "unread" | "history")}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto" aria-label="Caixa de avisos">
            <TabsTrigger value="unread" className="min-h-11 px-4 tabular-nums">
              Novos ({totalUnread})
            </TabsTrigger>
            <TabsTrigger value="history" className="min-h-11 px-4 tabular-nums">
              Histórico ({totalHistory})
            </TabsTrigger>
          </TabsList>

          {totalUnread > 1 && activeTab === "unread" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 px-3 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              Marcar todos como lidos
            </Button>
          ) : null}
        </div>

        {kinds.size > 1 || kindFilter !== "all" ? (
          <Select
            value={kindFilter}
            onValueChange={(value) => setKindFilter(value as "all" | NotificationKind)}
          >
            <SelectTrigger aria-label="Tipo de aviso" className="h-10 w-full bg-card sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="announcement">Avisos</SelectItem>
              <SelectItem value="payment_reminder">Financeiro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <TabsContent value="unread" className="mt-0">
        {list(unreadItems, {
          title: "Nenhum aviso novo",
          hint: "Avisos lidos ficam no Histórico.",
        })}
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        {list(historyItems, {
          title: "Histórico vazio",
          hint: "Os avisos aparecem aqui depois de lidos.",
        })}
      </TabsContent>
    </Tabs>
  );
}
