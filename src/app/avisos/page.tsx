import Link from "next/link";
import { Bell, Check, ExternalLink } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnnouncementForm } from "@/features/notifications/components/announcement-form";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { listInbox, listNotificationAudienceOptions } from "@/features/notifications/notification-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";

const kindLabels = { announcement: "Aviso", payment_reminder: "Financeiro", system: "Sistema" } as const;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ published?: string; error?: string }> }) {
  const profile = await requireProfile();
  const [items, pushActive, params, options] = await Promise.all([
    listInbox(profile),
    hasActivePushSubscription(profile),
    searchParams,
    profile.role === "admin" ? listNotificationAudienceOptions() : Promise.resolve(null)
  ]);
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY);

  return <PortalFrame profile={profile}><DashboardShell title="Avisos" subtitle="Comunicados da academia e lembretes importantes." badge={badge}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        {params.published ? <OperationToast tone="success" title="Aviso publicado" description="Os destinatários já podem consultar a mensagem nesta central." clearParams={["published"]} /> : null}
        {params.error ? <OperationToast tone="error" title="Não foi possível publicar" description="Revise os destinatários e o conteúdo do aviso." clearParams={["error"]} /> : null}
        {profile.role === "admin" && options ? <AnnouncementForm profiles={options.profiles.map((item) => ({ id: item.$id, name: item.full_name }))} classes={options.classes.map((item) => ({ id: item.$id, name: item.name, startTime: item.start_time }))} /> : null}
        <section className="space-y-3" aria-labelledby="inbox-title">
          <div><h2 id="inbox-title" className="text-lg font-semibold">Caixa de entrada</h2><p className="text-sm text-muted-foreground">{items.filter((item) => !item.recipient.read_at).length} não lido(s).</p></div>
          {items.length === 0 ? <EmptyState title="Nenhum aviso por enquanto" description="Novos comunicados e lembretes aparecerão aqui." icon={<Bell className="size-5" aria-hidden="true" />} /> : items.map(({ notification, recipient }) => <Card key={recipient.$id} className={recipient.read_at ? "bg-muted/20" : "border-primary/30"}>
            <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><div className="flex items-center gap-2"><StatusBadge tone={notification.kind === "payment_reminder" ? "warning" : "info"}>{kindLabels[notification.kind]}</StatusBadge>{!recipient.read_at ? <StatusBadge tone="success">Novo</StatusBadge> : null}</div><CardTitle className="text-base">{notification.title}</CardTitle><CardDescription>{new Date(notification.published_at).toLocaleString("pt-BR")}</CardDescription></div>{!recipient.read_at ? <form action={markNotificationReadAction}><input type="hidden" name="recipient_id" value={recipient.$id} /><Button type="submit" size="sm" variant="outline"><Check aria-hidden="true" />Marcar como lido</Button></form> : null}</div></CardHeader>
            <CardContent className="space-y-4"><Separator /><p className="whitespace-pre-wrap text-sm leading-6">{notification.body}</p>{notification.action_url ? <Button asChild size="sm" variant="outline"><Link href={notification.action_url}>Abrir <ExternalLink aria-hidden="true" /></Link></Button> : null}</CardContent>
          </Card>)}
        </section>
      </div>
      <aside><PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} /></aside>
    </div>
  </DashboardShell></PortalFrame>;
}
