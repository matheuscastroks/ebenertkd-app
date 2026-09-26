"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { Bell, Check, CheckCheck, CheckCircle2, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InboxItem, NotificationKind } from "@/features/notifications/types";

const kindLabels: Record<NotificationKind, string> = {
  announcement: "Aviso",
  payment_reminder: "Financeiro",
  system: "Sistema"
};

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
      }
    });
  };

  return (
    <section className="space-y-4" aria-labelledby="inbox-title">
      {/* Cabeçalho da Caixa de Entrada */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inbox-title" className="text-lg font-semibold">
            {activeTab === "unread" ? "Avisos pendentes" : "Histórico de avisos"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeTab === "unread"
              ? totalUnread
                ? `${totalUnread} ${totalUnread === 1 ? "aviso não lido" : "avisos não lidos"}`
                : "Tudo em dia por aqui"
              : `${totalHistory} ${totalHistory === 1 ? "aviso arquivado" : "avisos arquivados"}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador de Abas */}
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "unread" ? "default" : "ghost"}
              onClick={() => setActiveTab("unread")}
              className="h-8 text-xs"
            >
              Avisos
              {totalUnread > 0 && (
                <Badge
                  variant={activeTab === "unread" ? "secondary" : "default"}
                  className="ml-1.5 px-1.5 py-0 text-[10px]"
                >
                  {totalUnread}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "history" ? "default" : "ghost"}
              onClick={() => setActiveTab("history")}
              className="h-8 text-xs"
            >
              <History className="size-3.5 mr-1" aria-hidden="true" />
              Histórico
              {totalHistory > 0 && (
                <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {totalHistory}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filtro por Categoria */}
          <Select
            value={kindFilter}
            onValueChange={(val) => setKindFilter(val as "all" | NotificationKind)}
          >
            <SelectTrigger className="h-8 w-36 text-xs" aria-label="Filtrar tipo de aviso">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="announcement">Comunicados</SelectItem>
              <SelectItem value="payment_reminder">Financeiro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "unread" ? (
        unreadItems.length === 0 ? (
          <EmptyState
            title="Tudo em dia!"
            description="Você leu todos os comunicados recentes. O histórico de avisos anteriores continua disponível."
            icon={<CheckCircle2 className="size-6 text-primary" aria-hidden="true" />}
            action={
              totalHistory > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("history")}
                >
                  Ver histórico ({totalHistory})
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
                  <h3 className="font-semibold text-foreground text-sm">
                    {item.notification.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.notification.body}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                  {item.notification.action_url ? (
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Link href={item.notification.action_url}>
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
            icon={<History className="size-6 text-muted-foreground" aria-hidden="true" />}
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
                  <h3 className="font-medium text-foreground text-sm">
                    {item.notification.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.notification.body}
                  </p>
                </div>

                {item.notification.action_url && (
                  <div className="pt-2 border-t border-border/50">
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Link href={item.notification.action_url}>
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
    </section>
  );
}
