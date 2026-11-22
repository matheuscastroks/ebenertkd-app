"use client";

import { ChevronDown, Send } from "@/components/ui/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { InboxItem, NotificationView } from "@/features/notifications/types";

const audienceLabels = {
  all: "Todos",
  class: "Turma",
  profile: "Pessoa",
  system: "Sistema",
} as const;

export function NotificationCenter({
  received,
  sent,
}: {
  received: InboxItem[];
  sent?: NotificationView[];
}) {
  if (!sent) {
    return (
      <div className="max-w-3xl space-y-3">
        <NotificationInbox items={received} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      <section aria-label="Avisos pendentes" className="space-y-3 lg:col-span-7">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Avisos pendentes</h2>
          <span className="text-xs text-muted-foreground">
            Clique em um aviso para abrir e concluir
          </span>
        </div>
        <NotificationInbox items={received} />
      </section>

      <section aria-label="Comunicados enviados" className="space-y-3 lg:col-span-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Comunicados enviados</h2>
          <p className="text-xs text-muted-foreground">
            Mensagens publicadas manualmente pela academia.
          </p>
        </div>

        {sent.length > 0 ? (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl bg-card shadow-xs">
            {sent.map((notification) => (
              <Collapsible key={notification.$id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {audienceLabels[notification.audience]} ·{" "}
                      {new Date(notification.published_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="group h-8 shrink-0 px-2 text-xs"
                      aria-label={`Ler aviso enviado ${notification.title}`}
                    >
                      Ler
                      <ChevronDown
                        className="size-3.5 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-data-[state=open]:-scale-y-100 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="pt-2.5">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {notification.body}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Send className="size-5" aria-hidden="true" />}
            title="Nenhum comunicado enviado"
            description="Os avisos publicados por você aparecerão aqui."
          />
        )}
      </section>
    </div>
  );
}
