import { bulkApproveAction, bulkConfirmTeamAction, reviewRegistrationDocumentAction, submitToFederationAction } from "@/app/actions/championships";
import { FilterChips } from "@/components/shared/filter-chips";
import { getRegistrationHub } from "@/features/events/championship-queries";
import { HubQueue, type HubRow } from "@/features/events/components/hub-queue";
import { REGISTRATION_STATUS_LABEL } from "@/features/events/labels";
import { HUB_QUEUE_LABEL, HUB_QUEUES, type HubQueue as HubQueueKey } from "@/features/events/rules/hub-rules";
import { ROUTES } from "@/lib/navigation/routes";

const ACTIONS: Partial<Record<HubQueueKey, { action: (formData: FormData) => void | Promise<void>; label: string; field?: string; hidden?: Record<string, string> }>> = {
  approval: { action: bulkApproveAction, label: "Aprovar selecionadas" },
  interest: { action: bulkConfirmTeamAction, label: "Confirmar na equipe" },
  documents: { action: reviewRegistrationDocumentAction, label: "Aprovar documentos", field: "document_id", hidden: { decision: "approved" } },
  submit: { action: submitToFederationAction, label: "Marcar como enviados" },
};

const queueAnchor = (queue: HubQueueKey) => `fila-${queue}`;

type Hub = Awaited<ReturnType<typeof getRegistrationHub>>;

function rowsOf(hub: Hub, queue: HubQueueKey): HubRow[] {
  const items = hub.queues[queue];
  if (queue === "documents") {
    return items.flatMap((item) =>
      item.pendingDocuments.map((document) => ({
        value: document.id,
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        name: item.name,
        photoDocumentId: item.photoDocumentId,
        detail: `${document.kindLabel} · ${item.optionLabel}`,
      }))
    );
  }
  return items.map((item) => ({
    value: item.registrationId,
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    name: item.name,
    photoDocumentId: item.photoDocumentId,
    detail: [item.optionLabel, REGISTRATION_STATUS_LABEL[item.status], item.detail].filter(Boolean).join(" · "),
  }));
}

/**
 * Inscrições: só as filas com pendência aparecem, na ordem do processo,
 * com um resumo no topo que leva a cada fila. As vazias viram uma linha no fim.
 */
export async function HubContent() {
  const hub = await getRegistrationHub();
  const queues = HUB_QUEUES.map((queue) => ({ queue, rows: rowsOf(hub, queue) }));
  const pending = queues.filter((item) => item.rows.length > 0);
  const empty = queues.filter((item) => item.rows.length === 0);

  if (pending.length === 0) {
    return (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">
        Nenhuma inscrição esperando você. Aprovações, documentos, pagamentos e envios à federação aparecem aqui quando houver.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 1 ? (
        <FilterChips
          label="Filas com pendência"
          scroll
          items={pending.map(({ queue, rows }) => ({
            label: HUB_QUEUE_LABEL[queue].title,
            href: `#${queueAnchor(queue)}`,
            count: rows.length,
          }))}
        />
      ) : null}

      {pending.map(({ queue, rows }) => {
        const config = ACTIONS[queue];
        return (
          <HubQueue
            key={queue}
            id={queueAnchor(queue)}
            title={HUB_QUEUE_LABEL[queue].title}
            hint={HUB_QUEUE_LABEL[queue].hint}
            rows={rows}
            action={config?.action}
            fieldName={config?.field}
            actionLabel={config?.label}
            hiddenFields={config?.hidden}
            returnTo={ROUTES.adminEventHub}
          />
        );
      })}

      {empty.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem pendências: {empty.map(({ queue }) => HUB_QUEUE_LABEL[queue].title.toLocaleLowerCase("pt-BR")).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
