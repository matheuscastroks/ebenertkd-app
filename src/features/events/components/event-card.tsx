import Link from "next/link";
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
    <li className="t-interactive-row flex flex-col gap-3 px-4 py-3.5 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
          <EventTypeBadge type={event.event_type} />
          <EventStatusBadge status={event.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="tabular-nums">
            {formatEventDay(event.starts_at)}
            {exam ? "" : ` às ${formatEventTime(event.starts_at)}`}
          </span>
          {event.location_text ? ` · ${event.location_text}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          {occupancy}
          {extras.length ? ` · ${extras.join(" · ")}` : ""}
          {deadline ? ` · ${deadline}` : ""}
        </p>
      </div>
      <Button asChild variant="outline" size="sm" className="min-h-9 self-start sm:self-center">
        <Link href={href}>
          Abrir
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </li>
  );
}
