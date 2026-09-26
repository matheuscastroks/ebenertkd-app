"use client";

import { useState } from "react";
import { Bell, ChevronDown, Send } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationInbox } from "@/features/notifications/components/notification-inbox";
import type { InboxItem, NotificationView } from "@/features/notifications/types";

const audienceLabels = { all: "Todos", class: "Turma", profile: "Pessoa", system: "Sistema" } as const;

export function NotificationCenter({ received, sent }: { received: InboxItem[]; sent?: NotificationView[] }) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  return <div className="space-y-5">
    {sent ? <div className="flex gap-2 border-b pb-3" aria-label="Tipos de aviso"><Button type="button" size="sm" variant={tab === "received" ? "default" : "ghost"} aria-pressed={tab === "received"} onClick={() => setTab("received")}><Bell aria-hidden="true" />Recebidos</Button><Button type="button" size="sm" variant={tab === "sent" ? "default" : "ghost"} aria-pressed={tab === "sent"} onClick={() => setTab("sent")}><Send aria-hidden="true" />Enviados</Button></div> : null}
    {tab === "received" ? <NotificationInbox items={received} /> : <section className="space-y-3" aria-label="Avisos enviados"><div><h2 className="text-lg font-semibold">Avisos enviados</h2><p className="text-sm text-muted-foreground">Mensagens publicadas por você.</p></div>{sent?.length ? <div className="divide-y overflow-hidden rounded-xl border bg-card">{sent.map((notification) => <Collapsible key={notification.$id} className="px-4 py-3 sm:px-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{notification.title}</p><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-1 text-xs text-muted-foreground">{audienceLabels[notification.audience]} · {new Date(notification.published_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div><CollapsibleTrigger asChild><Button size="sm" variant="ghost" aria-label={`Ler aviso enviado ${notification.title}`}>Ler<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger></div><CollapsibleContent className="pt-3"><p className="whitespace-pre-wrap text-sm leading-6">{notification.body}</p></CollapsibleContent></Collapsible>)}</div> : <EmptyState icon={<Send className="size-5" aria-hidden="true" />} title="Nenhum aviso enviado" description="Os comunicados publicados por você aparecerão aqui." />}</section>}
  </div>;
}
