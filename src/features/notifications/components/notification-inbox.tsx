"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterInboxItems, type InboxKindFilter, type InboxReadFilter } from "@/features/notifications/inbox-filters";
import type { InboxItem } from "@/features/notifications/types";

const PAGE_SIZE = 20;
const kindLabels = { announcement: "Aviso", payment_reminder: "Financeiro", system: "Sistema" } as const;

function InboxRow({ item, read, onRead, onToggle }: { item: InboxItem; read: boolean; onRead: (id: string) => void; onToggle: (id: string, open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const { notification, recipient } = item;
  return <Collapsible open={open} onOpenChange={(next) => { setOpen(next); onToggle(recipient.$id, next); if (next && !read) onRead(recipient.$id); }} className="px-4 py-3 sm:px-5">
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`mt-2 size-2 shrink-0 rounded-full ${read ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{notification.title}</p><StatusBadge tone={notification.kind === "payment_reminder" ? "warning" : "info"}>{kindLabels[notification.kind]}</StatusBadge></div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(notification.published_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{read ? "" : " · Não lido"}</p></div></div><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" aria-label={open ? `Fechar ${notification.title}` : `Ler ${notification.title}`} className="shrink-0">{open ? "Fechar" : "Ler"}<ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></Button></CollapsibleTrigger></div>
    <CollapsibleContent className="pl-5 pt-3 sm:pl-5"><p className="whitespace-pre-wrap text-sm leading-6">{notification.body}</p>{notification.action_url ? <Button asChild variant="outline" size="sm" className="mt-4"><Link href={notification.action_url}>Abrir página<ExternalLink aria-hidden="true" /></Link></Button> : null}</CollapsibleContent>
  </Collapsible>;
}

export function NotificationInbox({ items }: { items: InboxItem[] }) {
  const [readIds, setReadIds] = useState(() => new Set(items.filter((item) => item.recipient.read_at).map((item) => item.recipient.$id)));
  const [openedIds, setOpenedIds] = useState(() => new Set<string>());
  const [readFilter, setReadFilter] = useState<InboxReadFilter>("all");
  const [kindFilter, setKindFilter] = useState<InboxKindFilter>("all");
  const [page, setPage] = useState(1);
  const marking = useRef(new Set<string>());
  const filtered = useMemo(() => filterInboxItems(items, readFilter, kindFilter, readIds, openedIds), [items, readFilter, kindFilter, readIds, openedIds]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const unread = items.filter((item) => !readIds.has(item.recipient.$id)).length;
  const markRead = async (id: string) => {
    if (marking.current.has(id)) return;
    marking.current.add(id);
    try {
      const data = new FormData();
      data.set("recipient_id", id);
      await markNotificationReadAction(data);
      setReadIds((previous) => new Set([...previous, id]));
      window.dispatchEvent(new Event("notifications:changed"));
    } catch {
      toast.error("Não foi possível marcar o aviso como lido", { description: "Tente novamente em instantes." });
    } finally {
      marking.current.delete(id);
    }
  };
  const toggle = (id: string, open: boolean) => setOpenedIds((previous) => { const next = new Set(previous); if (open) next.add(id); else next.delete(id); return next; });

  return <section className="space-y-4" aria-labelledby="inbox-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="inbox-title" className="text-lg font-semibold">Caixa de entrada</h2><p className="text-sm text-muted-foreground">{unread ? `${unread} ${unread === 1 ? "aviso não lido" : "avisos não lidos"}` : "Tudo em dia por aqui"}</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={readFilter === "all" ? "default" : "outline"} aria-pressed={readFilter === "all"} onClick={() => { setReadFilter("all"); setPage(1); }}>Todos</Button><Button type="button" size="sm" variant={readFilter === "unread" ? "default" : "outline"} aria-pressed={readFilter === "unread"} onClick={() => { setReadFilter("unread"); setPage(1); }}>Não lidos</Button><Select value={kindFilter} onValueChange={(value) => { setKindFilter(value as InboxKindFilter); setPage(1); }}><SelectTrigger className="w-40" aria-label="Filtrar tipo de aviso"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="announcement">Comunicados</SelectItem><SelectItem value="payment_reminder">Financeiro</SelectItem><SelectItem value="system">Sistema</SelectItem></SelectContent></Select></div></div>
    {visible.length ? <div className="divide-y overflow-hidden rounded-xl border bg-card">{visible.map((item) => <InboxRow key={item.recipient.$id} item={item} read={readIds.has(item.recipient.$id)} onRead={markRead} onToggle={toggle} />)}</div> : <EmptyState title="Nenhum aviso encontrado" description="Experimente outro filtro ou aguarde um novo comunicado." icon={<Bell className="size-5" aria-hidden="true" />} />}
    {filtered.length > PAGE_SIZE ? <nav className="flex items-center justify-between gap-3" aria-label="Páginas de avisos"><p className="text-sm text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon-sm" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" /></Button><span className="text-sm tabular-nums">{currentPage} / {totalPages}</span><Button type="button" variant="outline" size="icon-sm" aria-label="Próxima página" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden="true" /></Button></div></nav> : null}
  </section>;
}
