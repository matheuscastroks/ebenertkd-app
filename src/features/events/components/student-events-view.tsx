import Link from "next/link";
import { AppIllustration } from "@/components/shared/app-illustration";
import { eventIllustration } from "@/components/shared/illustration-catalog";
import { confirmInterestAction } from "@/app/actions/events";
import { Calendar, Clock, MapPin, Users } from "@/components/ui/icons";
import { ReadableDate } from "@/components/shared/readable-date";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatEventTime } from "@/features/events/dates";
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium"><div className="inline-flex items-center gap-2"><Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><ReadableDate value={startsAt} /></div><div className="inline-flex items-center gap-2 tabular-nums"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{formatEventTime(startsAt)}</div></div>
  );
}

function OpenEventCard({ item, props }: { item: StudentOpenEvent; props: Props }) {
  const { event } = item;
  const allMine = item.options.length > 0 && item.options.every((entry) => entry.mine);
  const price = props.showFinancial ? priceText(item) : null;
  const championship = event.event_type === "championship";
  const eligibilityReasons = [...new Set(item.options.filter((entry) => !entry.eligible).flatMap((entry) => entry.reasons))];
  const guestsAllowed = event.audience !== "students" && props.viewer.kind !== "minor" && !championship;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 sm:p-5">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4">
          <AppIllustration name={eventIllustration(event.event_type)} context="event" className="sm:row-span-2" />
          <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
            <h3 className="text-base font-semibold leading-snug text-foreground">{event.title}</h3>
            <EventTypeBadge type={event.event_type} />
          </div>
          <dl className="col-span-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 [overflow-wrap:anywhere]">
            <div>
              <dt className="sr-only">Data</dt>
              <dd className="flex items-start gap-1.5"><Calendar aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><ReadableDate value={event.starts_at} weekday /></dd>
            </div>
            <div>
              <dt className="sr-only">Horário</dt>
              <dd className="flex items-center gap-1.5 tabular-nums"><Clock aria-hidden="true" className="size-4 shrink-0" />{formatEventTime(event.starts_at)}</dd>
            </div>
            <div className="w-full">
              <dt className="sr-only">Local</dt>
              <dd className="flex items-start gap-1.5"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{event.location_text || "Local a confirmar"}</span></dd>
            </div>
          </dl>
        </div>
        {event.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{event.description}</p> : null}
        {championship ? <p className="pt-2 text-sm text-muted-foreground">{event.organizer_name ? `Organização: ${event.organizer_name}` : "A academia monta a equipe e envia à federação"}</p> : null}
        {championship && item.deadlines ? <StudentDeadlineList deadlines={item.deadlines} /> : null}
        {item.attendeeCount ? <div className="flex flex-wrap items-center gap-2"><AvatarGroup people={item.attendees ?? []} max={4} total={item.attendeeCount} size="sm" surface="card" label={`${item.attendeeCount} ${item.attendeeCount === 1 ? "aluno inscrito" : "alunos inscritos"}`} /><span className="text-sm text-muted-foreground">{item.attendeeCount} {item.attendeeCount === 1 ? "aluno inscrito" : "alunos inscritos"}</span><span className="sr-only">Inscrições</span></div> : null}
        {eligibilityReasons.length > 0 && item.registrationState === "open" ? eligibilityReasons.length === 1 && item.options.length === 1 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{eligibilityReasons[0].charAt(0).toUpperCase() + eligibilityReasons[0].slice(1)}</p>
        ) : (
          <details className="text-sm text-muted-foreground">
            <summary className="min-h-11 cursor-pointer py-3 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">Condições para participar</summary>
            <ul className="space-y-2 pb-1 leading-relaxed">
              {item.options.filter((entry) => !entry.eligible).map((entry) => (
                <li key={entry.option.$id}><span className="font-medium">{entry.option.label}:</span> {entry.reasons.join("; ")}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <dl className="flex min-w-0 flex-wrap items-end gap-x-4 gap-y-2">
          {price ? <div><dt className="text-xs text-muted-foreground">Valor</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{price}</dd></div> : null}
          {!championship ? <div className="text-sm"><dt className="sr-only">Vagas</dt><dd className="flex items-center gap-2 text-muted-foreground"><Users aria-hidden="true" className="size-4 shrink-0" />{item.seatsLeft === null ? "Vagas ilimitadas" : item.seatsLeft === 0 ? "Lotado (lista de espera)" : `${item.seatsLeft} vagas restantes`}</dd></div> : null}
        </dl>
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
    <li className="rounded-xl bg-card p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold leading-snug text-foreground">{event.title}</p>
          <RegistrationStatusBadge status={registration.status} />
          {registration.status === "waitlisted" && registration.waitlist_position ? <StatusBadge tone="neutral">{registration.waitlist_position}º na fila</StatusBadge> : null}
        </div>
        <div className="text-sm text-muted-foreground">
          <When startsAt={event.starts_at} />
        </div>
        {event.location_text ? <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{event.location_text}</div> : null}
        <p className="text-sm text-muted-foreground">
          {option?.label}
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
    return <EmptyState illustration="empty-journey" title="Cadastro de aluno não encontrado" description="Conclua a matrícula para ver e se inscrever nos eventos da academia." />;
  }
  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="eventos-abertos">
        <h2 id="eventos-abertos" className="text-base font-semibold">
          Próximos eventos
        </h2>
        {props.open.length === 0 ? (
          <EmptyState illustration="empty-agenda" title="Nenhum evento no momento" description="Campeonatos, aulões, seminários e confraternizações aparecem aqui assim que o professor publicar." />
        ) : (
          <ul className="grid items-stretch gap-4 xl:grid-cols-2">
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
          <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhuma inscrição ativa.</p>
        ) : (
          <ul className="space-y-4">
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
          <ul className="space-y-4">
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
