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

  return <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "unread" | "history")} className="space-y-4">
    <TabsList className="h-auto" aria-label="Caixa de avisos">
      <TabsTrigger value="unread" className="min-h-11">Avisos ({totalUnread})</TabsTrigger>
      <TabsTrigger value="history" className="min-h-11">Histórico ({totalHistory})</TabsTrigger>
    </TabsList>
    <div className="flex flex-wrap items-center gap-3">
      <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as "all" | NotificationKind)}>
        <SelectTrigger aria-label="Tipo de aviso" className="h-11 w-48"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="announcement">Avisos</SelectItem><SelectItem value="payment_reminder">Financeiro</SelectItem><SelectItem value="system">Sistema</SelectItem></SelectContent>
      </Select>
      {totalUnread > 1 && <Button type="button" variant="outline" className="h-11" onClick={handleMarkAllRead}>Marcar todos como lidos</Button>}
    </div>
    <TabsContent value="unread" className="space-y-3">
      {unreadItems.length ? unreadItems.map((item) => <NotificationItem key={item.recipient.$id} notification={item} onMarkRead={handleMarkAsRead} />) : <p className="py-6 text-sm text-muted-foreground">Nenhum aviso novo</p>}
    </TabsContent>
    <TabsContent value="history" className="space-y-3">
      {historyItems.length ? historyItems.map((item) => <NotificationItem key={item.recipient.$id} notification={item} onMarkRead={handleMarkAsRead} />) : <p className="py-6 text-sm text-muted-foreground">Histórico vazio</p>}
    </TabsContent>
  </Tabs>;
}
