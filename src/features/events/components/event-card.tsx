import Link from "next/link";
import { AppIllustration } from "@/components/shared/app-illustration";
import { eventIllustration } from "@/components/shared/illustration-catalog";
import { ReadableDate } from "@/components/shared/readable-date";
import { Calendar, Clock, MapPin, Users } from "@/components/ui/icons";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { Button } from "@/components/ui/button";
import { formatEventDay, formatEventTime } from "@/features/events/dates";
import { EventStatusBadge, EventTypeBadge } from "@/features/events/components/status-badges";
import type { EventCardData } from "@/features/events/event-service";
import { adminEventPath, adminExamPath } from "@/lib/navigation/routes";

/** Cartão da agenda: tipo, data, local, ocupação e pendências. Exames abrem a banca; demais, o detalhe do evento. */
export function EventCard({ data }: { data: EventCardData; compact?: boolean }) {
  const { event } = data;
  const exam = event.event_type === "belt_exam";
  const href = exam ? adminExamPath(event.$id) : adminEventPath(event.$id);
  const occupancy = exam
    ? `${data.examParticipants} candidato${data.examParticipants === 1 ? "" : "s"}`
    : event.capacity
      ? `${data.seatsTaken}/${event.capacity} vagas`
      : `${data.seatsTaken} inscrito${data.seatsTaken === 1 ? "" : "s"}`;
  const extras = [data.waitlisted ? `${data.waitlisted} na espera` : null, data.pendingApproval ? `${data.pendingApproval} pendente${data.pendingApproval === 1 ? "" : "s"}` : null].filter(Boolean);
  const deadline = event.registration_closes_at && !["completed", "cancelled"].includes(event.status) ? `Inscrições até ${formatEventDay(event.registration_closes_at)}` : null;

  return (
    <li className="t-interactive-row flex min-w-0 flex-col gap-3 rounded-xl bg-card shadow-elevation-1 p-4 sm:p-5">
      <div className="grid flex-1 content-start items-start grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4">
        <AppIllustration name={eventIllustration(event.event_type)} context="event" className="sm:row-span-2" />
        <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
          <h3 className="text-base font-semibold leading-snug text-foreground">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <EventTypeBadge type={event.event_type} />
            <EventStatusBadge status={event.status} />
          </div>
        </div>
        <dl className="col-span-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2 [overflow-wrap:anywhere]">
          <div>
            <dt className="sr-only">Data</dt>
            <dd className="flex items-start gap-1.5"><Calendar className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><ReadableDate value={event.starts_at} weekday /></dd>
          </div>
          {!exam ? <div><dt className="sr-only">Horário</dt><dd className="flex items-center gap-1.5 tabular-nums"><Clock className="size-4 shrink-0" aria-hidden="true" />{formatEventTime(event.starts_at)}</dd></div> : null}
          {event.location_text ? <div className="w-full"><dt className="sr-only">Local</dt><dd className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{event.location_text}</span></dd></div> : null}
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5"><Users className="size-4 shrink-0" aria-hidden="true" />{occupancy}</div>
          {extras.length ? <p className="font-medium text-foreground">{extras.join(" · ")}</p> : null}
          {deadline ? <p>{deadline}</p> : null}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <AvatarGroup people={data.people} total={data.peopleTotal} max={4} size="sm" surface="card" />
          <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-9">
            <Link href={href}>Abrir<ArrowRightIcon className="size-3.5" aria-hidden="true" /></Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
