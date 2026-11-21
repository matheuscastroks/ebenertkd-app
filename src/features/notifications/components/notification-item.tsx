"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Megaphone, Sparkles, Wallet } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { InboxItem, NotificationKind } from "../types";

const labels: Record<NotificationKind, string> = {
  announcement: "Aviso",
  payment_reminder: "Financeiro",
  system: "Sistema",
};

const iconBg: Record<NotificationKind, string> = {
  announcement: "bg-info/12 text-info",
  payment_reminder: "bg-warning/15 text-warning-foreground",
  system: "bg-muted text-muted-foreground",
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "payment_reminder") {
    return <Wallet className="size-4" aria-hidden="true" />;
  }
  if (kind === "system") {
    return <Sparkles className="size-4" aria-hidden="true" />;
  }
  return <Megaphone className="size-4" aria-hidden="true" />;
}

/** Uma linha da caixa de avisos no estilo Apple Notification Center: ícone discreto, hierarquia clara e ações leves. */
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
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <article
      className={cn(
        "t-interactive-row rounded-xl transition-colors duration-(--duration-quick)",
        compact ? "p-3.5" : "p-4",
        unread
          ? "bg-card shadow-xs"
          : "bg-card/70 hover:bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            iconBg[item.notification.kind]
          )}
        >
          <KindIcon kind={item.notification.kind} />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {unread ? (
                <span
                  aria-label="Não lido"
                  role="img"
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
              ) : null}
              <span className="font-medium text-[11px] uppercase tracking-wider">{labels[item.notification.kind]}</span>
            </div>
            <time
              dateTime={item.notification.published_at}
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {formattedDate}
            </time>
          </div>

          <h3
            className={cn(
              "text-sm leading-snug text-foreground",
              unread ? "font-semibold" : "font-medium text-foreground/90"
            )}
          >
            {item.notification.title}
          </h3>

          <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {item.notification.body}
          </p>

          {item.notification.action_url || unread ? (
            <div className="-mb-1 -ml-1.5 flex flex-wrap items-center gap-1.5 pt-1">
              {item.notification.action_url ? (
                <Link
                  href={item.notification.action_url}
                  onClick={onNavigate}
                  className="inline-flex h-11 min-h-11 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-primary-text transition-colors duration-(--duration-quick) hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Abrir página
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
              {unread ? (
                <button
                  type="button"
                  onClick={() => onMarkRead(item.recipient.$id)}
                  className="inline-flex h-11 min-h-11 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-(--duration-quick) hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  Marcar como lido
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
