import { Suspense, type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { completeEventAction, setEventStatusAction } from "@/app/actions/events";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { getChampionshipBundle } from "@/features/events/championship-queries";
import { ChampionshipDetail } from "@/features/events/components/championship-detail";
import { AddRegistrationDialog } from "@/features/events/components/add-registration-dialog";
import { CancelEventDialog } from "@/features/events/components/cancel-event-dialog";
import { CheckinList, type CheckinRow } from "@/features/events/components/checkin-list";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { EventTabs } from "@/features/events/components/event-tabs";
import { paymentLabel, RegistrationTable } from "@/features/events/components/registration-table";
import { EventStatusBadge, EventTypeBadge } from "@/features/events/components/status-badges";
import { formatEventDay, formatEventTime } from "@/features/events/dates";
import type { Profile } from "@/features/auth/types";
import { getEventBundle, type EventBundle } from "@/features/events/event-service";
import { StatusBadge } from "@/components/shared/status-badge";
import { effectiveRegistrationState, isEventTerminal } from "@/features/events/rules/status-rules";
import type { Student } from "@/features/students/types";
import { requireProfile } from "@/lib/auth/session";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { toClientData } from "@/lib/client-data";
import { formatBrl } from "@/lib/money";
import { adminEventPath, adminExamPath, ROUTES } from "@/lib/navigation/routes";

const AUDIENCE_LABEL = { students: "Somente alunos", students_and_guests: "Alunos e convidados", public: "Aberto ao público" } as const;

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

async function EventDetail({ admin, bundle, tab, ok, erro }: { admin: Profile; bundle: EventBundle; tab?: string; ok?: string; erro?: string }) {
  const { event, options, rows } = bundle;
  const returnTo = adminEventPath(event.$id);
  const terminal = isEventTerminal(event.status);
  const state = effectiveRegistrationState(event);
  const active = rows.filter((row) => !["cancelled", "rejected"].includes(row.registration.status));
  const confirmed = rows.filter((row) => ["confirmed", "checked_in", "completed"].includes(row.registration.status)).length;
  const waitlisted = rows.filter((row) => row.registration.status === "waitlisted").length;
  const pending = rows.filter((row) => ["pending_approval", "interested"].includes(row.registration.status)).length;
  const present = rows.filter((row) => ["checked_in", "completed"].includes(row.registration.status)).length;
  const hasPaidCharges = rows.some((row) => row.charge && !["pending", "overdue", "cancelled"].includes(row.charge.status) && active.includes(row));
  const expectedCents = active.filter((row) => row.registration.status !== "waitlisted").reduce((sum, row) => sum + row.registration.price_cents, 0);
  const receivedCents = rows.reduce((sum, row) => sum + (row.charge?.status === "paid" ? row.charge.amount_cents : 0), 0);

  const students = (await listAllRows<Student>(APPWRITE_IDS.tables.students, [Query.equal("status", ["active"])])).map((student) => ({ profileId: student.profile_id, name: student.full_name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const checkinRows: CheckinRow[] = rows
    .filter((row) => ["confirmed", "checked_in", "completed", "no_show"].includes(row.registration.status))
    .map((row) => ({ id: row.registration.$id, name: row.name, optionLabel: row.option?.label ?? "—", companions: row.registration.companions, status: row.registration.status, isGuest: row.isGuest, imageUrl: row.imageUrl }));

  const overview = (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <Stat label="Vagas" value={event.capacity ? `${bundle.seatsTaken}/${event.capacity}` : String(bundle.seatsTaken)} hint={event.capacity ? "ocupadas" : "sem limite"} extra={<AvatarGroup people={active.map((row) => ({ name: row.name, imageUrl: row.imageUrl }))} max={5} size="sm" surface="card" label="Inscritos e interessados" />} />
        <Stat label="Confirmados" value={String(confirmed)} hint={`${present} presentes`} />
        <Stat label="Pendências" value={String(pending)} hint={`${waitlisted} na lista de espera`} />
        <Stat label="Receita" value={formatBrl(receivedCents)} hint={`${formatBrl(expectedCents)} previstos`} />
      </dl>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-card p-4 text-sm shadow-xs sm:grid-cols-2 sm:p-5">
        <div>
          <dt className="text-muted-foreground">Quando</dt>
          <dd className="font-medium tabular-nums">
            {formatEventDay(event.starts_at)} às {formatEventTime(event.starts_at)}
            {event.ends_at ? ` – ${formatEventTime(event.ends_at)}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Local</dt>
          <dd className="font-medium">{event.location_text || "A confirmar"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Público</dt>
          <dd className="font-medium">
            {AUDIENCE_LABEL[event.audience]}
            {event.requires_approval ? " · com aprovação" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Inscrições</dt>
          <dd className="font-medium">
            {state === "open" ? "Abertas" : state === "closed" ? "Encerradas" : "Ainda não abertas"}
            {event.registration_closes_at ? ` · até ${formatEventDay(event.registration_closes_at)}` : ""}
          </dd>
        </div>
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
          <dt className="mb-1 text-muted-foreground">Opções</dt>
          <dd>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {options.map((option) => (
                <li key={option.$id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{option.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {option.price_cents > 0 ? formatBrl(option.price_cents) : "Gratuito"}
                    {option.capacity ? ` · ${option.capacity} vagas` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      {!terminal ? (
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "draft" ? <StatusForm eventId={event.$id} status="registration_open" label="Publicar e abrir inscrições" variant="default" /> : null}
          {event.status === "published" ? <StatusForm eventId={event.$id} status="registration_open" label="Abrir inscrições" variant="default" /> : null}
          {event.status === "registration_open" ? <StatusForm eventId={event.$id} status="registration_closed" label="Encerrar inscrições" /> : null}
          {event.status === "registration_closed" ? <StatusForm eventId={event.$id} status="registration_open" label="Reabrir inscrições" /> : null}
          {["registration_open", "registration_closed", "in_progress"].includes(event.status) ? (
            <form action={completeEventAction}>
              <input type="hidden" name="event_id" value={event.$id} />
              <FormSubmitButton className="min-h-11" pendingLabel="Encerrando…">
                Concluir evento
              </FormSubmitButton>
            </form>
          ) : null}
          <CancelEventDialog eventId={event.$id} activeRegistrations={active.length} hasPaidCharges={hasPaidCharges} />
        </div>
      ) : null}
    </div>
  );

  const registrations = (
    <div className="space-y-4">
      {!terminal ? (
        <div className="flex justify-end">
          <AddRegistrationDialog eventId={event.$id} returnTo={returnTo} options={options.map((option) => ({ id: option.$id, label: option.label }))} students={students} guestsAllowed={event.audience !== "students"} maxCompanions={event.max_companions ?? 0} />
        </div>
      ) : null}
      <RegistrationTable rows={toClientData(rows)} returnTo={returnTo} />
    </div>
  );

  const paymentRows = rows.filter((row) => row.registration.price_cents > 0 && !["cancelled", "rejected", "waitlisted", "interested"].includes(row.registration.status));
  const payments =
    paymentRows.length === 0 ? (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhuma cobrança neste evento.</p>
    ) : (
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
        {paymentRows.map((row) => {
          const payment = paymentLabel(row);
          return (
            <li key={row.registration.$id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <span className="text-sm font-medium">{row.name}</span>
              <span className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                {formatBrl(row.registration.price_cents)}
                <StatusBadge tone={payment.tone}>{payment.text}</StatusBadge>
              </span>
            </li>
          );
        })}
      </ul>
    );

  const checkin = <CheckinList rows={checkinRows} returnTo={returnTo} closed={terminal} />;

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
            { id: "inscritos", label: "Inscritos", badge: active.length, content: registrations },
            { id: "pagamentos", label: "Pagamentos", content: payments },
            { id: "checkin", label: "Check-in", content: checkin }
          ]}
        />
      </div>
    </PortalShell>
  );
}

async function AdminEventContent({
  admin,
  eventId,
  tab,
  ok,
  erro,
}: {
  admin: Profile;
  eventId: string;
  tab?: string;
  ok?: string;
  erro?: string;
}) {
  const bundle = await getEventBundle(eventId).catch(() => null);
  if (!bundle) notFound();
  if (bundle.event.event_type === "championship") {
    const championship = await getChampionshipBundle(eventId).catch(() => null);
    if (!championship) notFound();
    return <ChampionshipDetail admin={admin} bundle={championship} tab={tab} ok={ok} erro={erro} />;
  }
  // Exames têm tela própria (bancas, elegibilidade e promoção de faixa).
  if (bundle.event.event_type === "belt_exam") redirect(adminExamPath(eventId));
  return <EventDetail admin={admin} bundle={bundle} tab={tab} ok={ok} erro={erro} />;
}

export default async function AdminEventPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ aba?: string; ok?: string; erro?: string }> }) {
  const [admin, { eventId }, query] = await Promise.all([requireProfile("admin"), params, searchParams]);
  return (
    <Suspense
      fallback={
        <PortalShell
          profile={admin}
          back={{ label: "Eventos", href: ROUTES.adminEvents }}
          title={<InlineValueSkeleton className="h-7 w-48" />}
          subtitle={<InlineValueSkeleton className="h-4 w-56" />}
        >
          <InlineRowsSkeleton rows={5} label="Carregando detalhes do evento…" />
        </PortalShell>
      }
    >
      <AdminEventContent admin={admin} eventId={eventId} tab={query.aba} ok={query.ok} erro={query.erro} />
    </Suspense>
  );
}
