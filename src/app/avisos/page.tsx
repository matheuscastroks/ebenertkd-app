import { Suspense } from "react";
import { isPushConfigured } from "@/features/notifications/push-config";
import { BellIcon } from "@/components/ui/bell";
import { PlusIcon } from "@/components/ui/plus";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { AnnouncementForm } from "@/features/notifications/components/announcement-form";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { PushPermissionCard } from "@/features/notifications/components/push-permission-card";
import { listInbox, listNotificationAudienceOptions, listSentAnnouncements } from "@/features/notifications/notification-service";
import { hasActivePushSubscription } from "@/features/notifications/push-service";
import type { Profile } from "@/features/auth/types";
import { requireProfile } from "@/lib/auth/session";

async function AsyncNotificationCenter({ profile }: { profile: Profile }) {
  const [items, sent] = await Promise.all([
    listInbox(profile, { unreadOnly: true, limit: 50 }),
    profile.role === "admin" ? listSentAnnouncements(profile) : Promise.resolve(undefined),
  ]);

  return <NotificationCenter received={items} sent={sent} />;
}

async function HeaderActionButtons({ profile }: { profile: Profile }) {
  const [pushActive, options] = await Promise.all([
    hasActivePushSubscription(profile),
    profile.role === "admin" ? listNotificationAudienceOptions() : Promise.resolve(null),
  ]);
  const pushConfigured = isPushConfigured();

  return (
    <>
      <ResponsiveDialog
        trigger={
          <Button variant="outline">
            <BellIcon aria-hidden="true" />
            Notificações
          </Button>
        }
        title="Notificações neste dispositivo"
        description="Escolha se deseja receber avisos no navegador."
      >
        <PushPermissionCard configured={pushConfigured} initiallyActive={pushActive} />
      </ResponsiveDialog>
      {profile.role === "admin" && options ? (
        <ResponsiveDialog
          trigger={
            <Button>
              <PlusIcon aria-hidden="true" />
              Novo aviso
            </Button>
          }
          title="Publicar aviso"
          description="Escolha quem receberá a mensagem."
        >
          <AnnouncementForm
            profiles={options.profiles.map((item) => ({ id: item.$id, name: item.full_name }))}
            classes={options.classes.map((item) => ({ id: item.$id, name: item.name, startTime: item.start_time }))}
          />
        </ResponsiveDialog>
      ) : null}
    </>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; error?: string }>;
}) {
  const [profile, params] = await Promise.all([
    requireProfile(),
    searchParams,
  ]);

  return (
    <PortalShell
      profile={profile}
      title="Avisos"
      subtitle="Pendências e comunicados da academia."
      headerActions={
        <Suspense fallback={<Skeleton className="h-9 w-28 rounded-lg" />}>
          <HeaderActionButtons profile={profile} />
        </Suspense>
      }
    >
      <div className="space-y-5">
        {params.published ? (
          <OperationToast
            tone="success"
            title="Aviso publicado"
            description="Os destinatários já podem consultar a mensagem nesta central."
            clearParams={["published"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível publicar"
            description="Revise os destinatários e o conteúdo do aviso."
            clearParams={["error"]}
          />
        ) : null}
        <Suspense fallback={<InlineRowsSkeleton rows={4} label="Carregando avisos…" />}>
          <AsyncNotificationCenter profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
