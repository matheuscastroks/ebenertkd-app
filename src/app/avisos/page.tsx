import { Bell, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { AnnouncementForm } from "@/features/notifications/components/announcement-form";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { listInbox, listNotificationAudienceOptions, listSentAnnouncements } from "@/features/notifications/notification-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import { requireProfile } from "@/lib/auth/session";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ published?: string; error?: string }> }) {
  const profile = await requireProfile();
  const [items, pushActive, params, options, sent] = await Promise.all([
    listInbox(profile),
    hasActivePushSubscription(profile),
    searchParams,
    profile.role === "admin" ? listNotificationAudienceOptions() : Promise.resolve(null),
    profile.role === "admin" ? listSentAnnouncements(profile) : Promise.resolve(undefined)
  ]);
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY);

  return <PortalFrame profile={profile}><DashboardShell title="Avisos" subtitle="Comunicados e lembretes da academia." badge={badge} headerActions={<><ResponsiveDialog trigger={<Button variant="outline"><Bell aria-hidden="true" />Notificações</Button>} title="Notificações neste dispositivo" description="Escolha se deseja receber avisos no navegador."><PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} /></ResponsiveDialog>{profile.role === "admin" && options ? <ResponsiveDialog trigger={<Button><Plus aria-hidden="true" />Novo aviso</Button>} title="Publicar aviso" description="Escolha quem receberá a mensagem."><AnnouncementForm profiles={options.profiles.map((item) => ({ id: item.$id, name: item.full_name }))} classes={options.classes.map((item) => ({ id: item.$id, name: item.name, startTime: item.start_time }))} /></ResponsiveDialog> : null}</>}>
    <div className="space-y-5">
        {params.published ? <OperationToast tone="success" title="Aviso publicado" description="Os destinatários já podem consultar a mensagem nesta central." clearParams={["published"]} /> : null}
        {params.error ? <OperationToast tone="error" title="Não foi possível publicar" description="Revise os destinatários e o conteúdo do aviso." clearParams={["error"]} /> : null}
        <NotificationCenter received={items} sent={sent} />
    </div>
  </DashboardShell></PortalFrame>;
}
