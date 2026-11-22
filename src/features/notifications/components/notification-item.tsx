"use client";

import Link from "next/link";
import { Check, Megaphone, Sparkles, Wallet } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { InboxItem, NotificationKind } from "../types";

const iconBg: Record<NotificationKind, string> = {
  announcement: "bg-info/12 text-info",
  payment_reminder: "bg-warning/15 text-warning-foreground",
  system: "bg-muted text-muted-foreground",
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "payment_reminder") {
    return <Wallet className="size-3.5" aria-hidden="true" />;
  }
  if (kind === "system") {
    return <Sparkles className="size-3.5" aria-hidden="true" />;
  }
  return <Megaphone className="size-3.5" aria-hidden="true" />;
}

/** Formata data/hora de notificação de forma compacta em PT-BR ("agora", "5 min", "2 h", "ontem" ou "18 nov"). */
export function formatRelativeTimeBr(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(date) === dayKey(yesterday)) return "ontem";

  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "America/Sao_Paulo",
    })
    .replace(/\.$/, "");
}

/** Linha compacta de notificação: ao clicar no conteúdo navega e já marca como lida automaticamente. */
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
  const relativeTime = formatRelativeTimeBr(item.notification.published_at);

  const handleOpenLink = () => {
    if (unread) onMarkRead(item.recipient.$id);
    onNavigate?.();
  };

  const bodyContent = (
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <div
        className={cn(
          "relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          iconBg[item.notification.kind]
        )}
      >
        <KindIcon kind={item.notification.kind} />
        {unread ? (
          <span
            aria-label="Não lido"
            role="img"
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-medium leading-snug text-foreground">
            {item.notification.title}
          </h3>
          <time
            dateTime={item.notification.published_at}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {relativeTime}
          </time>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.notification.body}
        </p>
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        "t-interactive-row group flex items-start gap-1.5 transition-colors duration-(--duration-quick) hover:bg-muted/50",
        compact ? "px-3 py-2.5" : "px-4 py-3"
      )}
    >
      {item.notification.action_url ? (
        <Link
          href={item.notification.action_url}
          onClick={handleOpenLink}
          className="flex min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {bodyContent}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1">{bodyContent}</div>
      )}

      {unread ? (
        <button
          type="button"
          onClick={() => onMarkRead(item.recipient.$id)}
          aria-label="Marcar como lido"
          title="Marcar como lido"
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-(--duration-quick) hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
}
