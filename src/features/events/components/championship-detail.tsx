import type { ReactNode } from "react";
import Link from "next/link";
import { sendDeadlineRemindersAction } from "@/app/actions/championships";
import { completeEventAction, setEventStatusAction } from "@/app/actions/events";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import type { ChampionshipBundle } from "@/features/events/championship-queries";
import { CancelEventDialog } from "@/features/events/components/cancel-event-dialog";
import { ChampionshipTeamTable, DeadlineTimeline, DocumentsPanel, FederationSubmitPanel, ResultsEditor } from "@/features/events/components/championship-panels";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { EventTabs } from "@/features/events/components/event-tabs";
import { paymentLabel } from "@/features/events/components/registration-table";
import { EventStatusBadge, EventTypeBadge } from "@/features/events/components/status-badges";
import { formatEventDay, formatEventTime } from "@/features/events/dates";
import { effectiveRegistrationState, isEventTerminal } from "@/features/events/rules/status-rules";
import { studentPhotoUrl } from "@/features/students/photo-url";
import { toClientData } from "@/lib/client-data";
import { formatBrl } from "@/lib/money";
import { adminEventPath, ROUTES } from "@/lib/navigation/routes";

function Stat({ label, value, hint, extra }: { label: string; value: string; hint?: string; extra?: ReactNode }) {
  return (
    <div className="p-4 sm:px-5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 space-y-0.5">
        <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {extra ? <div className="pt-1.5">{extra}</div> : null}
      </dd>
    </div>
  );
}

function StatusForm({ eventId, status, label, variant = "outline" }: { eventId: string; status: string; label: string; variant?: "outline" | "default" }) {
  return (
    <form action={setEventStatusAction}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <FormSubmitButton variant={variant} className="min-h-11" pendingLabel="Salvando…">
        {label}
      </FormSubmitButton>
    </form>
  );
}

/** Detalhe do campeonato para a professora: prazos, equipe, documentos, pagamentos, resultados e exportação. */
export function ChampionshipDetail({ admin, bundle, tab, ok, erro }: { admin: Profile; bundle: ChampionshipBundle; tab?: string; ok?: string; erro?: string }) {
  const { event, options, deadlines, rows } = bundle;
  const returnTo = adminEventPath(event.$id);
  const terminal = isEventTerminal(event.status);
  const state = effectiveRegistrationState(event);
  const active = rows.filter((row) => !["cancelled", "rejected"].includes(row.registration.status));
  const interested = rows.filter((row) => ["interested", "pending_approval"].includes(row.registration.status)).length;
  const confirmed = rows.filter((row) => ["confirmed", "checked_in", "completed"].includes(row.registration.status));
  const submitted = confirmed.filter((row) => row.registration.external_submitted_at).length;
  const pendingDocs = rows.reduce((sum, row) => sum + row.documents.filter((document) => document.status === "pending").length, 0);
  const hasPaidCharges = active.some((row) => [row.charge, row.federationCharge].some((charge) => charge && !["pending", "overdue", "cancelled"].includes(charge.status)));
  const medals = rows.filter((row) => row.result && row.result.medal !== "none").length;
  const expectedCents = confirmed.reduce((sum, row) => sum + row.registration.price_cents + (row.registration.federation_price_cents ?? 0), 0);
  const receivedCents = rows.reduce((sum, row) => sum + (row.charge?.status === "paid" ? row.charge.amount_cents : 0) + (row.federationCharge?.status === "paid" ? row.federationCharge.amount_cents : 0), 0);
  const clientRows = toClientData(rows);

  const overview = (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <Stat label="Na equipe" value={String(confirmed.length)} hint={`${interested} aguardando confirmação`} extra={<AvatarGroup people={confirmed.map((row) => ({ name: row.name, sex: row.sex, imageUrl: studentPhotoUrl(row.photoDocumentId) }))} max={5} size="sm" surface="card" label="Equipe confirmada" />} />
        <Stat label="Enviados à federação" value={`${submitted}/${confirmed.length}`} hint={pendingDocs ? `${pendingDocs} documento(s) para revisar` : "sem documentos pendentes"} />
        <Stat label="Medalhas" value={String(medals)} hint="registradas em Resultados" />
        <Stat label="Receita" value={formatBrl(receivedCents)} hint={`${formatBrl(expectedCents)} previstos (academia + federação)`} />
      </dl>
      <section className="space-y-3 rounded-xl bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Cronograma da federação</h3>
          {!terminal && deadlines.length > 0 ? (
            <form action={sendDeadlineRemindersAction}>
              <input type="hidden" name="return_to" value={returnTo} />
              <FormSubmitButton variant="outline" size="sm" className="min-h-9" pendingLabel="Enviando…">
                Enviar lembretes agora
              </FormSubmitButton>
            </form>
          ) : null}
        </div>
        <DeadlineTimeline deadlines={toClientData(deadlines)} />
      </section>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-card p-4 text-sm shadow-xs sm:grid-cols-2 sm:p-5">
        <div>
          <dt className="text-muted-foreground">Quando</dt>
          <dd className="font-medium tabular-nums">
            {formatEventDay(event.starts_at)} às {formatEventTime(event.starts_at)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Local</dt>
          <dd className="font-medium">{event.location_text || "A confirmar"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organizador</dt>
          <dd className="font-medium">{event.organizer_name || "Não informado"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interesse da equipe</dt>
          <dd className="font-medium">
            {state === "open" ? "Aberto" : state === "closed" ? "Encerrado" : "Ainda não aberto"}
            {event.registration_closes_at ? ` · até ${formatEventDay(event.registration_closes_at)}` : ""}
          </dd>
        </div>
        {event.external_url ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Edital</dt>
            <dd>
              <Link href={event.external_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                {event.external_url}
              </Link>
            </dd>
          </div>
        ) : null}
        {event.description ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Descrição</dt>
            <dd className="whitespace-pre-line font-medium">{event.description}</dd>
          </div>
        ) : null}
        {event.status === "cancelled" && event.cancellation_reason ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Motivo do cancelamento</dt>
            <dd className="font-medium">{event.cancellation_reason}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="mb-1 text-muted-foreground">Categorias ({options.length})</dt>
          <dd>
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {options.map((option) => (
                <li key={option.$id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{option.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    Academia {formatBrl(option.price_cents)} · Federação {formatBrl(option.federation_fee_cents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      {!terminal ? (
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "draft" ? <StatusForm eventId={event.$id} status="registration_open" label="Publicar e abrir interesse" variant="default" /> : null}
          {event.status === "published" ? <StatusForm eventId={event.$id} status="registration_open" label="Abrir interesse" variant="default" /> : null}
          {event.status === "registration_open" ? <StatusForm eventId={event.$id} status="registration_closed" label="Encerrar interesse" /> : null}
          {event.status === "registration_closed" ? <StatusForm eventId={event.$id} status="registration_open" label="Reabrir interesse" /> : null}
          {["registration_open", "registration_closed", "in_progress"].includes(event.status) ? (
            <form action={completeEventAction}>
              <input type="hidden" name="event_id" value={event.$id} />
              <FormSubmitButton className="min-h-11" pendingLabel="Encerrando…">
                Concluir campeonato
              </FormSubmitButton>
            </form>
          ) : null}
          <CancelEventDialog eventId={event.$id} activeRegistrations={active.length} hasPaidCharges={hasPaidCharges} />
        </div>
      ) : null}
    </div>
  );

  const team = (
    <div className="space-y-4">
      <FederationSubmitPanel rows={clientRows} returnTo={returnTo} />
      <ChampionshipTeamTable rows={clientRows} returnTo={returnTo} />
    </div>
  );

  const paymentRows = active.filter((row) => (row.registration.price_cents > 0 || (row.registration.federation_price_cents ?? 0) > 0) && row.registration.status !== "interested");
  const payments =
    paymentRows.length === 0 ? (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">As cobranças (academia e federação) são criadas quando você confirma o atleta na equipe.</p>
    ) : (
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
        {paymentRows.map((row) => {
          const academy = paymentLabel({ registration: row.registration, option: row.option, name: row.name, isGuest: false, charge: row.charge });
          const federation = paymentLabel({ registration: { ...row.registration, price_cents: row.registration.federation_price_cents ?? 0 }, option: row.option, name: row.name, isGuest: false, charge: row.federationCharge });
          return (
            <li key={row.registration.$id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <span className="text-sm font-medium">{row.name}</span>
              <span className="flex flex-wrap items-center gap-3 text-sm tabular-nums text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  Academia {formatBrl(row.registration.price_cents)}
                  <StatusBadge tone={academy.tone}>{academy.text}</StatusBadge>
                </span>
                <span className="flex items-center gap-1.5">
                  Federação {formatBrl(row.registration.federation_price_cents ?? 0)}
                  <StatusBadge tone={federation.tone}>{federation.text}</StatusBadge>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );

  const exportTab = (
    <section className="space-y-3 rounded-xl bg-card p-4 shadow-xs sm:p-5">
      <h3 className="text-base font-semibold">Lista para a federação</h3>
      <p className="text-sm text-muted-foreground">CSV com nome, nascimento, sexo, faixa, categoria e peso da equipe confirmada. Abre direto no Excel. A lista fica em {confirmed.length} atleta(s).</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="min-h-11">
          <a href={`${returnTo}/exportar`} download>
            Baixar equipe confirmada
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href={`${returnTo}/exportar?interessados=1`} download>
            Incluir quem só tem interesse
          </a>
        </Button>
      </div>
    </section>
  );

  return (
    <PortalShell
      profile={admin} back={{ label: "Eventos", href: ROUTES.adminEvents }}
      title={event.title}
      subtitle={`${formatEventDay(event.starts_at)} · ${event.location_text || "Local a confirmar"}`}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <EventTypeBadge type={event.event_type} />
          <EventStatusBadge status={event.status} />
        </div>
      }
    >
      <div className="w-full min-w-0">
        <EventFeedback ok={ok} erro={erro} />
        <EventTabs
          initial={tab}
          tabs={[
            { id: "visao", label: "Visão geral", content: overview },
            { id: "inscritos", label: "Equipe", badge: active.length, content: team },
            { id: "documentos", label: "Documentos", badge: pendingDocs, content: <DocumentsPanel rows={clientRows} returnTo={returnTo} /> },
            { id: "pagamentos", label: "Pagamentos", content: payments },
            { id: "resultados", label: "Resultados", content: <ResultsEditor rows={clientRows} returnTo={returnTo} /> },
            { id: "exportar", label: "Exportar", content: exportTab }
          ]}
        />
      </div>
    </PortalShell>
  );
}
