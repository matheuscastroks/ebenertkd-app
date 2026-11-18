"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { InboxItem, NotificationKind } from "../types";

const labels: Record<NotificationKind, string> = {
  announcement: "Aviso",
  payment_reminder: "Financeiro",
  system: "Sistema",
};

const tones: Record<NotificationKind, StatusTone> = {
  announcement: "info",
  payment_reminder: "warning",
  system: "neutral",
};

/** Uma linha da caixa de avisos: título primeiro, metadados discretos, ações só quando servem. */
export function NotificationItem({
  notification: item,
  onMarkRead,
  onNavigate,
  compact = false,
}: {
  notification: InboxItem;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const unread = !item.recipient.read_at;
  const formattedDate = new Date(item.notification.published_at).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <article
      className={`t-interactive-row space-y-2.5 ${compact ? "p-3.5" : "p-4 sm:p-5"} ${
        unread ? "bg-card hover:bg-muted/35" : "bg-muted/15 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {unread ? (
            <span
              aria-label="Não lido"
              role="img"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
          <div className="min-w-0 space-y-1">
            <h3
              className={`text-sm leading-snug text-foreground sm:text-base ${
                unread ? "font-semibold" : "font-medium"
              }`}
            >
              {item.notification.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={tones[item.notification.kind]} className="text-xs">
                {labels[item.notification.kind]}
              </StatusBadge>
              <time
                dateTime={item.notification.published_at}
                className="text-xs text-muted-foreground tabular-nums"
              >
                {formattedDate}
              </time>
            </div>
          </div>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {item.notification.body}
      </p>

      {item.notification.action_url || unread ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.notification.action_url ? (
            <Button asChild variant="outline" size="sm" className="h-11 px-3.5">
              <Link href={item.notification.action_url} onClick={onNavigate}>
                Abrir página
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          {unread ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 px-3 text-muted-foreground hover:text-foreground"
              onClick={() => onMarkRead(item.recipient.$id)}
            >
              <Check className="size-3.5" aria-hidden="true" />
              Marcar como lido
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
