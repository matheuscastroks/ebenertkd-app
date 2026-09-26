"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell, Check, CheckCheck, CheckCircle2, ExternalLink, History, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import type { InboxItem, NotificationKind } from "@/features/notifications/types";

const kindLabels: Record<NotificationKind, string> = {
  announcement: "Aviso",
  payment_reminder: "Financeiro",
  system: "Sistema"
};

export function NotificationDrawer({
  open,
  onOpenChange,
  initialItems
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItems?: InboxItem[];
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems ?? []);
  const [activeTab, setActiveTab] = useState<"unread" | "history">("unread");
  const [loading, setLoading] = useState(!initialItems);
  const [marking, setMarking] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/notifications/inbox", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: InboxItem[] };
        if (mounted && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch {
        // Offline fallback
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    const handleChanged = () => {
      void load();
    };
    window.addEventListener("notifications:changed", handleChanged);

    return () => {
      mounted = false;
      window.removeEventListener("notifications:changed", handleChanged);
    };
  }, [open]);

  const unreadItems = items.filter((item) => !item.recipient.read_at);
  const historyItems = items.filter((item) => Boolean(item.recipient.read_at));

  const refreshInbox = async () => {
    try {
      const response = await fetch("/api/notifications/inbox", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: InboxItem[] };
      if (Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleMarkAsRead = async (recipientId: string) => {
    if (marking.has(recipientId)) return;
    setMarking((prev) => new Set(prev).add(recipientId));

    // Optimistically update: remove from unread and move to history
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
        body: JSON.stringify({ recipient_id: recipientId })
      });
      if (!response.ok) throw new Error("failed");
      window.dispatchEvent(new Event("notifications:changed"));
      toast.success("Aviso movido para o histórico.");
    } catch {
      toast.error("Não foi possível marcar o aviso como lido.", {
        description: "Tente novamente em instantes."
      });
      // Revert if error
      void refreshInbox();
    } finally {
      setMarking((prev) => {
        const next = new Set(prev);
        next.delete(recipientId);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadItems.length === 0) return;
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
        toast.error("Erro ao marcar avisos como lidos.");
        void refreshInbox();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-5" aria-hidden="true" />
              </div>
              <div>
                <SheetTitle className="text-lg">Avisos</SheetTitle>
                <SheetDescription className="text-xs">
                  {unreadItems.length === 0
                    ? "Tudo em dia por aqui"
                    : `${unreadItems.length} ${unreadItems.length === 1 ? "aviso não lido" : "avisos não lidos"}`}
                </SheetDescription>
              </div>
            </div>
            <Button asChild size="sm" className="h-8 gap-1 text-xs">
              <Link href="/avisos" onClick={() => onOpenChange(false)}>
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Novo aviso</span>
              </Link>
            </Button>
          </div>

          {/* Abas: Avisos Recentes e Histórico */}
          <div className="mt-3 flex gap-2 border-t pt-3">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "unread" ? "default" : "outline"}
              onClick={() => setActiveTab("unread")}
              className="flex-1 text-xs"
            >
              Avisos
              {unreadItems.length > 0 && (
                <Badge
                  variant={activeTab === "unread" ? "secondary" : "default"}
                  className="ml-1.5 px-1.5 py-0 text-[10px]"
                >
                  {unreadItems.length}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
              className="flex-1 text-xs"
            >
              <History className="size-3.5 mr-1" aria-hidden="true" />
              Histórico
              {historyItems.length > 0 && (
                <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {historyItems.length}
                </Badge>
              )}
            </Button>
          </div>
        </SheetHeader>

        {/* Lista de Notificações Empilhadas */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Carregando avisos…</p>
            </div>
          ) : activeTab === "unread" ? (
            unreadItems.length === 0 ? (
              <EmptyState
                title="Tudo em dia!"
                description="Você leu todos os avisos recentes. Os comunicados antigos ficam salvos no histórico."
                icon={<CheckCircle2 className="size-7 text-primary" aria-hidden="true" />}
                action={
                  historyItems.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("history")}
                    >
                      Ver histórico ({historyItems.length})
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {unreadItems.length > 1 && (
                  <div className="flex justify-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <CheckCheck className="size-3.5 mr-1" aria-hidden="true" />
                      Marcar todos como lidos
                    </Button>
                  </div>
                )}

                {unreadItems.map((item) => (
                  <div
                    key={item.recipient.$id}
                    className="flex flex-col gap-2.5 rounded-xl border bg-card p-4 transition-all duration-150 hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                        <StatusBadge
                          tone={
                            item.notification.kind === "payment_reminder"
                              ? "warning"
                              : item.notification.kind === "system"
                                ? "neutral"
                                : "info"
                          }
                        >
                          {kindLabels[item.notification.kind]}
                        </StatusBadge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.notification.published_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Sao_Paulo"
                        })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        {item.notification.title}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {item.notification.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                      {item.notification.action_url ? (
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          <Link
                            href={item.notification.action_url}
                            onClick={() => onOpenChange(false)}
                          >
                            Abrir página
                            <ExternalLink className="size-3 ml-1" aria-hidden="true" />
                          </Link>
                        </Button>
                      ) : (
                        <div />
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(item.recipient.$id)}
                        disabled={marking.has(item.recipient.$id)}
                        className="h-8 text-xs gap-1.5 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                        Marcar como lido
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Aba Histórico */
            historyItems.length === 0 ? (
              <EmptyState
                title="Histórico vazio"
                description="Os avisos marcados como lidos aparecerão aqui para consulta futura."
                icon={<History className="size-7 text-muted-foreground" aria-hidden="true" />}
              />
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => (
                  <div
                    key={item.recipient.$id}
                    className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone="neutral">
                          {kindLabels[item.notification.kind]}
                        </StatusBadge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground py-0">
                          Lido
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.notification.published_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Sao_Paulo"
                        })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground text-sm">
                        {item.notification.title}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {item.notification.body}
                      </p>
                    </div>

                    {item.notification.action_url && (
                      <div className="pt-2 border-t border-border/50">
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link
                            href={item.notification.action_url}
                            onClick={() => onOpenChange(false)}
                          >
                            Abrir página
                            <ExternalLink className="size-3 ml-1" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Central de comunicados</span>
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs text-primary font-medium">
            <Link href="/avisos" onClick={() => onOpenChange(false)}>
              Abrir central completa &rarr;
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
