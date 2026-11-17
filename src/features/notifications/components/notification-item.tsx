"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { InboxItem } from "../types";
const labels = { announcement: "Aviso", payment_reminder: "Financeiro", system: "Sistema" };
export function NotificationItem({ notification: item, onMarkRead, compact = false }: {
  notification: InboxItem; onMarkRead: (id: string) => void; compact?: boolean;
}) {
 return <article className={`space-y-3 rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
   <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
     {!item.recipient.read_at && <span aria-label="Não lido" className="size-2 rounded-full bg-primary" />}
     <span>{labels[item.notification.kind]}</span>
     <time dateTime={item.notification.published_at}>{new Date(item.notification.published_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</time>
   </div>
   <h3 className="text-base font-semibold">{item.notification.title}</h3>
   <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.notification.body}</p>
   <div className="flex flex-wrap gap-2">
     {item.notification.action_url && <Button asChild variant="outline" className="h-11"><Link href={item.notification.action_url}>Abrir página</Link></Button>}
     {!item.recipient.read_at && <Button type="button" variant="outline" className="h-11" onClick={() => onMarkRead(item.recipient.$id)}>Marcar como lido</Button>}
   </div>
 </article>;
}
