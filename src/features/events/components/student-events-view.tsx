import Link from "next/link";
import { confirmInterestAction } from "@/app/actions/events";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatEventDay, formatEventTime } from "@/features/events/dates";
import { CancelRegistrationDialog } from "@/features/events/components/cancel-registration-dialog";
import { ChampionshipEntryDetails, StudentDeadlineList } from "@/features/events/components/championship-entry-details";
import { ChampionshipRegisterDialog } from "@/features/events/components/championship-register-dialog";
import { GuestRegisterDialog, RegisterDialog } from "@/features/events/components/register-dialog";
import { EventTypeBadge, RegistrationStatusBadge } from "@/features/events/components/status-badges";
import { isRegistrationOpen } from "@/features/events/rules/status-rules";
import type { StudentEventEntry, StudentOpenEvent } from "@/features/events/student-events-service";
import { examFeeLabels, examFeeTones } from "@/features/exams/labels";
import { formatBrl } from "@/lib/money";

export type EventsViewer = { kind: "self" } | { kind: "guardian"; dependentName: string } | { kind: "minor" };

type Props = {
  hasStudent: boolean;
  studentProfileId: string;
  returnTo: string;
  billingHref: string;
  examsHref: string;
  /** Cadastro do aluno (para completar o sexo antes de competir). */
  enrollmentHref?: string;
  showFinancial: boolean;
  viewer: EventsViewer;
  open: StudentOpenEvent[];
  upcoming: StudentEventEntry[];
  past: StudentEventEntry[];
};

function priceText(item: StudentOpenEvent) {
  const prices = item.options.map((entry) => entry.option.price_cents + (entry.option.federation_fee_cents ?? 0));
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === 0) return "Gratuito";
  return min === max ? formatBrl(min) : `a partir de ${formatBrl(min)}`;
}

function When({ startsAt }: { startsAt: string }) {
  return (
    <span className="tabular-nums">
      {formatEventDay(startsAt)} às {formatEventTime(startsAt)}
    </span>
  );
}

function OpenEventCard({ item, props }: { item: StudentOpenEvent; props: Props }) {
  const { event } = item;
  const allMine = item.options.length > 0 && item.options.every((entry) => entry.mine);
  const price = props.showFinancial ? priceText(item) : null;
  const championship = event.event_type === "championship";
  const guestsAllowed = event.audience !== "students" && props.viewer.kind !== "minor" && !championship;
  return (
    <li className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
            <EventTypeBadge type={event.event_type} />
          </div>
          <p className="text-sm text-muted-foreground">
            <When startsAt={event.starts_at} />
            {event.location_text ? ` · ${event.location_text}` : ""}
          </p>
          {event.description ? <p className="max-w-prose text-sm text-muted-foreground">{event.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            {price ? `${price} · ` : ""}
            {championship ? (event.organizer_name ? `Organização: ${event.organizer_name}` : "A academia monta a equipe e envia à federação") : item.seatsLeft === null ? "Vagas ilimitadas" : item.seatsLeft === 0 ? "Lotado (lista de espera)" : `${item.seatsLeft} vagas restantes`}
          </p>
          {championship && item.deadlines ? <StudentDeadlineList deadlines={item.deadlines} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.registrationState === "open" ? (
            allMine ? (
              <StatusBadge tone="success">Você já está inscrito</StatusBadge>
            ) : (
              <>
                {championship ? <ChampionshipRegisterDialog item={item} studentProfileId={props.studentProfileId} returnTo={props.returnTo} who={props.viewer} showFinancial={props.showFinancial} profileHref={props.enrollmentHref} /> : <RegisterDialog item={item} studentProfileId={props.studentProfileId} returnTo={props.returnTo} who={props.viewer} showFinancial={props.showFinancial} />}
                {guestsAllowed ? <GuestRegisterDialog item={item} returnTo={props.returnTo} /> : null}
              </>
            )
          ) : (
            <StatusBadge tone="warning">{item.registrationState === "closed" ? "Inscrições encerradas" : "Inscrições ainda não abertas"}</StatusBadge>
          )}
        </div>
      </div>
      {item.options.some((entry) => !entry.eligible) && item.registrationState === "open" ? (
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {item.options
            .filter((entry) => !entry.eligible)
            .map((entry) => (
              <li key={entry.option.$id}>
                {entry.option.label}: {entry.reasons.join("; ")}
              </li>
            ))}
        </ul>
      ) : null}
    </li>
  );
}

function RegistrationRow({ entry, props, canCancel }: { entry: StudentEventEntry; props: Props; canCancel: boolean }) {
  const { registration, event, option, charge, federationCharge } = entry;
  const championship = event.event_type === "championship";
  const paid = [charge, federationCharge].some((item) => item && !["pending", "overdue", "cancelled"].includes(item.status));
  const confirmInterest = props.viewer.kind === "guardian" && registration.status === "interested" && !championship;
  const cancellable = canCancel && ["interested", "pending_approval", "confirmed", "waitlisted"].includes(registration.status) && isRegistrationOpen(event) && !paid && (props.viewer.kind !== "minor" || registration.status === "interested");
  return (
    <li className="p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          <RegistrationStatusBadge status={registration.status} />
          {registration.status === "waitlisted" && registration.waitlist_position ? <StatusBadge tone="neutral">{registration.waitlist_position}º na fila</StatusBadge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          <When startsAt={event.starts_at} />
          {option ? ` · ${option.label}` : ""}
          {registration.companions > 0 ? ` · +${registration.companions} acompanhante${registration.companions > 1 ? "s" : ""}` : ""}
        </p>
        {props.showFinancial
          ? [
              { label: championship ? "Academia" : "", charge },
              { label: "Federação", charge: federationCharge }
            ].map((line) =>
              line.charge ? (
                <p key={line.label || "charge"} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {line.label ? `${line.label}: ` : ""}
                  {formatBrl(line.charge.amount_cents)}
                  <StatusBadge tone={examFeeTones[line.charge.status]}>{examFeeLabels[line.charge.status]}</StatusBadge>
                  {line.charge.status === "pending" || line.charge.status === "overdue" ? (
                    <Link href={props.billingHref} className="font-medium text-primary underline-offset-4 hover:underline">
                      Pagar
                    </Link>
                  ) : null}
                </p>
              ) : null
            )
          : null}
        {paid && canCancel && ["confirmed", "pending_approval"].includes(registration.status) ? <p className="text-sm text-muted-foreground">Para cancelar uma inscrição paga, fale com o professor.</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {confirmInterest ? (
          <form action={confirmInterestAction}>
            <input type="hidden" name="registration_id" value={registration.$id} />
            <input type="hidden" name="return_to" value={props.returnTo} />
            <FormSubmitButton size="sm" className="min-h-9" pendingLabel="Confirmando…">
              Confirmar vaga
            </FormSubmitButton>
          </form>
        ) : null}
        {cancellable ? <CancelRegistrationDialog registrationId={registration.$id} returnTo={props.returnTo} personName={event.title} hasPaidCharge={false} /> : null}
      </div>
    </div>
    {championship ? <ChampionshipEntryDetails entry={entry} viewer={props.viewer} returnTo={props.returnTo} /> : null}
    </li>
  );
}

export function StudentEventsView(props: Props) {
  if (!props.hasStudent) {
    return <EmptyState title="Cadastro de aluno não encontrado" description="Conclua a matrícula para ver e se inscrever nos eventos da academia." />;
  }
  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="eventos-abertos">
        <h2 id="eventos-abertos" className="text-base font-semibold">
          Abertos para inscrição
        </h2>
        {props.open.length === 0 ? (
          <EmptyState title="Nenhum evento no momento" description="Campeonatos, aulões, seminários e confraternizações aparecem aqui assim que o professor publicar." />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {props.open.map((item) => (
              <OpenEventCard key={item.event.$id} item={item} props={props} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="minhas-inscricoes">
        <h2 id="minhas-inscricoes" className="text-base font-semibold">
          Minhas inscrições
        </h2>
        {props.upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhuma inscrição ativa.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {props.upcoming.map((entry) => (
              <RegistrationRow key={entry.registration.$id} entry={entry} props={props} canCancel />
            ))}
          </ul>
        )}
      </section>

      {props.past.length ? (
        <section className="space-y-3" aria-labelledby="historico-eventos">
          <h2 id="historico-eventos" className="text-base font-semibold">
            Histórico
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {props.past.map((entry) => (
              <RegistrationRow key={entry.registration.$id} entry={entry} props={props} canCancel={false} />
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Exames de faixa ficam em{" "}
        <Link href={props.examsHref} className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline">
          Faixa › Exames
        </Link>
        .
      </p>
    </div>
  );
}
