"use client";

import Link from "next/link";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { ReadableDate } from "@/components/shared/readable-date";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatEventTime } from "@/features/events/dates";
import { EVENT_TYPE_LABEL } from "@/features/events/labels";
import type { AgendaEvent, AgendaTraining } from "../monthly-agenda-rules";
import type { AttendanceCalendarStatus } from "../attendance-calendar-rules";
import { AddToCalendarButton } from "./add-to-calendar-button";
import { ROUTES } from "@/lib/navigation/routes";

const statuses: Record<AttendanceCalendarStatus, { label: string; tone: StatusTone }> = {
  present: { label: "Presente", tone: "success" },
  absent: { label: "Falta", tone: "danger" },
  excused: { label: "Falta justificada", tone: "warning" },
  scheduled: { label: "Previsto", tone: "neutral" },
  not_recorded: { label: "Sem chamada registrada", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "neutral" }
};

function TimeAndPlace({ time, location }: { time: string; location: string | null }) {
  return <div className="space-y-2 text-sm">
    <p className="flex items-center gap-2 font-medium tabular-nums"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{time}</p>
    {location ? <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{location}</span></p> : null}
  </div>;
}

export function AgendaTrainingDetail({ item }: { item: AgendaTraining }) {
  const status = statuses[item.status];
  return <article className="space-y-3" aria-label={item.className}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="text-base font-semibold">{item.className}</h3>
      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
    </div>
    {item.kind === "makeup" ? <p className="text-sm text-info-foreground">Treino de reposição</p> : null}
    <TimeAndPlace time={`${item.startTime} às ${item.endTime}`} location={item.location} />
    {item.status === "scheduled" ? <AddToCalendarButton uid={item.id} title={`Taekwondo · ${item.className}`} date={item.date} startTime={item.startTime} endTime={item.endTime} location={item.location} fileName={`treino-${item.date}`} label="Salvar treino" variant="ghost" align="start" /> : null}
  </article>;
}

export function AgendaEventDetail({ event }: { event: AgendaEvent }) {
  return <article className="space-y-3" aria-label={event.name}>
    <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABEL[event.type]}</p>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="text-base font-semibold">{event.name}</h3>
      {event.status === "cancelled" ? <StatusBadge>Cancelado</StatusBadge> : event.status === "completed" ? <StatusBadge>Concluído</StatusBadge> : null}
    </div>
    <TimeAndPlace time={formatEventTime(event.startsAt)} location={event.location} />
    {event.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{event.description}</p> : null}
    <Button asChild variant="outline" size="sm" className="min-h-11">
      <Link href={event.type === "belt_exam" ? ROUTES.studentExams : ROUTES.studentEvents}>
        {event.type === "belt_exam" ? "Ver exames de faixa" : "Ver evento e inscrições"}<ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Button>
  </article>;
}

export function AgendaMonthOverview({ events, nextTraining, now, onSelect }: { events: AgendaEvent[]; nextTraining?: AgendaTraining; now: string; onSelect: (day: string) => void }) {
  const ongoing = nextTraining && Date.parse(`${nextTraining.date}T${nextTraining.startTime}:00-03:00`) <= Date.parse(now);
  return <div className="space-y-6">
    <section aria-labelledby="next-agenda-training" className="space-y-3">
      <h2 id="next-agenda-training" className="text-base font-semibold">{ongoing ? "Treino em andamento" : "Próximo treino no mês"}</h2>
      {nextTraining ? <div className="space-y-3">
        <p className="text-sm font-medium">{nextTraining.className}</p>
        <p className="text-sm"><ReadableDate value={nextTraining.date} weekday /></p>
        <TimeAndPlace time={`${nextTraining.startTime} às ${nextTraining.endTime}`} location={nextTraining.location} />
        <Button variant="ghost" size="sm" className="min-h-11" onClick={() => onSelect(nextTraining.date)}>Ver dia<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div> : <p className="text-sm leading-relaxed text-muted-foreground">Nenhum outro treino previsto neste mês.</p>}
    </section>
    <section aria-labelledby="month-events" className="space-y-3">
      <h2 id="month-events" className="text-base font-semibold">Eventos do mês</h2>
      {events.length ? <ul className="space-y-2" aria-label="Eventos do mês">
        {events.map((event) => <li key={event.id}>
          <button type="button" className="flex min-h-16 w-full items-start gap-3 rounded-lg bg-muted p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none" onClick={() => onSelect(event.date)} aria-label={`${event.name}, dia ${Number(event.date.slice(8))}`}>
            <span className="min-w-8 text-center text-xl font-semibold tabular-nums" aria-hidden="true">{Number(event.date.slice(8))}</span>
            <span className="min-w-0 space-y-1"><span className="block text-sm font-medium leading-snug">{event.name}</span><span className="block text-sm text-muted-foreground">{event.status === "cancelled" ? "Cancelado" : formatEventTime(event.startsAt)} · {EVENT_TYPE_LABEL[event.type]}</span></span>
          </button>
        </li>)}
      </ul> : <p className="text-sm leading-relaxed text-muted-foreground">Nenhum evento neste mês. Os treinos da turma ficam marcados no calendário.</p>}
    </section>
  </div>;
}
