import Link from "next/link";
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
export function EventCard({ data }: { data: EventCardData }) {
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
    <li className="t-interactive-row flex flex-col gap-4 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-lg font-semibold leading-snug text-foreground">{event.title}</p>
          <EventTypeBadge type={event.event_type} />
          <EventStatusBadge status={event.status} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          <p className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" aria-hidden="true" /><ReadableDate value={event.starts_at} weekday /></p>
          {!exam ? <p className="flex items-center gap-2 tabular-nums"><Clock className="size-4 text-muted-foreground" aria-hidden="true" />{formatEventTime(event.starts_at)}</p> : null}
        </div>
        {event.location_text ? <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{event.location_text}</p> : null}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Users className="size-4 shrink-0" aria-hidden="true" />{occupancy}</p>
          {extras.length ? <p className="font-medium text-foreground">{extras.join(" · ")}</p> : null}
          {deadline ? <p>{deadline}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
        <AvatarGroup people={data.people} total={data.peopleTotal} max={4} size="sm" surface="card" />
        <Button asChild variant="outline" size="sm" className="min-h-9">
          <Link href={href}>
            Abrir
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
  );
}
