"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { InboxItem } from "../types";
const labels = { announcement: "Aviso", payment_reminder: "Financeiro", system: "Sistema" };
/** Uma linha da caixa de avisos: título primeiro, metadados discretos, ações só quando servem. */
export function NotificationItem({ notification: item, onMarkRead, compact = false }: {
  notification: InboxItem; onMarkRead: (id: string) => void; compact?: boolean;
}) {
 const unread = !item.recipient.read_at;
 return <article className={`space-y-2 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
   <div className="flex items-start gap-2">
     {unread ? <span aria-label="Não lido" role="img" className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
     <div className="min-w-0 flex-1 space-y-1">
       <h3 className={`text-base ${unread ? "font-semibold" : "font-medium"}`}>{item.notification.title}</h3>
       <p className="text-sm text-muted-foreground">
         {labels[item.notification.kind]} · <time dateTime={item.notification.published_at} className="tabular-nums">{new Date(item.notification.published_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</time>
       </p>
     </div>
   </div>
   <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{item.notification.body}</p>
   {item.notification.action_url || unread ? <div className="flex flex-wrap gap-2 pt-1">
     {item.notification.action_url && <Button asChild variant="outline" className="h-11"><Link href={item.notification.action_url}>Abrir página</Link></Button>}
     {unread && <Button type="button" variant="ghost" className="h-11" onClick={() => onMarkRead(item.recipient.$id)}>Marcar como lido</Button>}
   </div> : null}
 </article>;
}
