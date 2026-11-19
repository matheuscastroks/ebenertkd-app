import { Suspense } from "react";
import { bulkApproveAction, bulkConfirmTeamAction, reviewRegistrationDocumentAction, submitToFederationAction } from "@/app/actions/championships";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { getRegistrationHub } from "@/features/events/championship-queries";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { HubQueue, type HubRow } from "@/features/events/components/hub-queue";
import { REGISTRATION_STATUS_LABEL } from "@/features/events/labels";
import { HUB_QUEUE_LABEL, HUB_QUEUES, type HubQueue as HubQueueKey } from "@/features/events/rules/hub-rules";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const ACTIONS: Partial<Record<HubQueueKey, { action: (formData: FormData) => void | Promise<void>; label: string; field?: string; hidden?: Record<string, string> }>> = {
  approval: { action: bulkApproveAction, label: "Aprovar selecionadas" },
  interest: { action: bulkConfirmTeamAction, label: "Confirmar na equipe" },
  documents: { action: reviewRegistrationDocumentAction, label: "Aprovar documentos", field: "document_id", hidden: { decision: "approved" } },
  submit: { action: submitToFederationAction, label: "Marcar como enviados" }
};

async function HubContent() {
  const hub = await getRegistrationHub();
  if (hub.total === 0) {
    return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Tudo em dia. Aprovações, documentos, pagamentos e envios à federação pendentes aparecem aqui, agrupados por tipo de pendência.</p>;
  }
  return (
    <div className="space-y-4">
      {HUB_QUEUES.map((queue) => {
        const items = hub.queues[queue];
        const rows: HubRow[] =
          queue === "documents"
            ? items.flatMap((item) => item.pendingDocuments.map((document) => ({ value: document.id, eventId: item.eventId, eventTitle: item.eventTitle, name: item.name, photoDocumentId: item.photoDocumentId, detail: `${document.kindLabel} · ${item.optionLabel}` })))
            : items.map((item) => ({ value: item.registrationId, eventId: item.eventId, eventTitle: item.eventTitle, name: item.name, photoDocumentId: item.photoDocumentId, detail: [item.optionLabel, REGISTRATION_STATUS_LABEL[item.status], item.detail].filter(Boolean).join(" · ") }));
        const config = ACTIONS[queue];
        return <HubQueue key={queue} title={HUB_QUEUE_LABEL[queue].title} hint={HUB_QUEUE_LABEL[queue].hint} rows={rows} action={config?.action} fieldName={config?.field} actionLabel={config?.label} hiddenFields={config?.hidden} returnTo={ROUTES.adminEventHub} />;
      })}
    </div>
  );
}

export default async function EventRegistrationsHubPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [admin, query] = await Promise.all([requireProfile("admin"), searchParams]);
  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminEventHub}
      title="Central de inscrições"
      subtitle="Tudo que espera uma ação sua, por pendência: aprovar, confirmar a equipe, revisar documentos e enviar à federação."
      breadcrumbs={[{ label: "Eventos", href: ROUTES.adminEvents }, { label: "Central de inscrições" }]}
    >
      <div className="w-full min-w-0 space-y-4">
        <EventFeedback ok={query.ok} erro={query.erro} />
        <Suspense fallback={<ListItemsSkeleton count={4} />}>
          <HubContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
