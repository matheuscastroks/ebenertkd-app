"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationItem } from "./notification-item";
import type { InboxItem, NotificationKind } from "../types";

export function NotificationInbox({ items: initialItems }: { items: InboxItem[] }) {
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
    // Optimistic update: mark read immediately so it moves to history tab
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
        body: JSON.stringify({ recipient_id: recipientId })
      });
      if (!response.ok) throw new Error("failed");
      window.dispatchEvent(new Event("notifications:changed"));
      toast.success("Aviso movido para o histórico.");
    } catch {
      toast.error("Não foi possível marcar o aviso como lido", {
        description: "Tente novamente em instantes."
      });
      // Revert optimistic update
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
        recipient: { ...item.recipient, read_at: item.recipient.read_at ?? now }
      }))
    );

    startTransition(async () => {
      try {
        const response = await fetch("/api/notifications/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true })
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
  const list = (entries: InboxItem[], empty: { title: string; hint: string }) => entries.length
    ? <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{entries.map((item) => <NotificationItem key={item.recipient.$id} notification={item} onMarkRead={handleMarkAsRead} />)}</div>
    : <div className="rounded-xl border border-border bg-card px-4 py-8 text-center"><p className="text-sm font-medium">{empty.title}</p><p className="mt-1 text-sm text-muted-foreground">{empty.hint}</p></div>;

  return <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "unread" | "history")} className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TabsList className="h-auto" aria-label="Caixa de avisos">
        <TabsTrigger value="unread" className="min-h-11 tabular-nums">Novos ({totalUnread})</TabsTrigger>
        <TabsTrigger value="history" className="min-h-11 tabular-nums">Histórico ({totalHistory})</TabsTrigger>
      </TabsList>
      <div className="flex flex-wrap items-center gap-2">
        {kinds.size > 1 || kindFilter !== "all" ? <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as "all" | NotificationKind)}>
          <SelectTrigger aria-label="Tipo de aviso" className="h-11 w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="announcement">Avisos</SelectItem><SelectItem value="payment_reminder">Financeiro</SelectItem><SelectItem value="system">Sistema</SelectItem></SelectContent>
        </Select> : null}
        {totalUnread > 1 && activeTab === "unread" ? <Button type="button" variant="ghost" className="h-11" onClick={handleMarkAllRead}>Marcar todos como lidos</Button> : null}
      </div>
    </div>
    <TabsContent value="unread">
      {list(unreadItems, { title: "Nenhum aviso novo", hint: "Avisos lidos ficam no Histórico." })}
    </TabsContent>
    <TabsContent value="history">
      {list(historyItems, { title: "Histórico vazio", hint: "Os avisos aparecem aqui depois de lidos." })}
    </TabsContent>
  </Tabs>;
}
