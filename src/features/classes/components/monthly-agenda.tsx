"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, X, Minus } from "lucide-react";
import type { DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { ReadableDate } from "@/components/shared/readable-date";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/navigation/routes";
import { nextAgendaTraining, type AgendaTraining, type AgendaEvent } from "../monthly-agenda-rules";
import type { TrainingClass } from "../types";
import { findFirstOccurrenceDate } from "../student-calendar-rules";
import { AddToCalendarButton } from "./add-to-calendar-button";
import { AgendaEventDetail, AgendaMonthOverview, AgendaTrainingDetail } from "./agenda-activities";
import { MonthlyFrequency, type MonthlyFrequencyData } from "./monthly-frequency";

type AgendaClass = Pick<TrainingClass, "$id" | "name" | "weekdays" | "start_time" | "end_time" | "location">;
export type MonthlyAgendaProps = {
  month: string;
  today: string;
  now: string;
  training: AgendaTraining[];
  events: AgendaEvent[];
  trainingClass: AgendaClass | null;
  frequency: MonthlyFrequencyData;
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AgendaDayButton(props: React.ComponentProps<typeof DayButton>) {
  const { modifiers } = props;
  const labels = [modifiers.training && "treino", modifiers.event && "evento", modifiers.present && "presença registrada", modifiers.absent && "falta registrada", modifiers.excused && "falta justificada"].filter(Boolean);
  return <CalendarDayButton {...props} aria-label={`${props["aria-label"] ?? ""}${labels.length ? `, ${labels.join(", ")}` : ""}`} className={cn("h-12 min-h-11 gap-1 sm:h-14", props.className)}>
    {props.children}
    <span className="flex h-3 items-center justify-center gap-1" aria-hidden="true">
      {modifiers.present ? <Check className="size-3 text-success-foreground" /> : modifiers.absent ? <X className="size-3 text-danger-text" /> : modifiers.excused ? <Minus className="size-3 text-warning-foreground" /> : modifiers.training ? <span className="size-1.5 rounded-full bg-muted-foreground" /> : null}
      {modifiers.event ? <span className="size-1.5 rounded-full bg-info-foreground" /> : null}
    </span>
  </CalendarDayButton>;
}

export function MonthlyAgenda({ month, today, now, training, events, trainingClass, frequency }: MonthlyAgendaProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<{ month: string; day: string | null }>({ month, day: null });
  const selectedDay = selection.month === month ? selection.day : null;
  const monthDate = useMemo(() => new Date(`${month}-01T12:00:00`), [month]);
  const lastDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12);
  const monthLabel = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const nextTraining = nextAgendaTraining(training, now);
  const selectedTraining = training.filter((item) => item.date === selectedDay);
  const selectedEvents = events.filter((event) => event.date === selectedDay);
  const selectDay = (day: string) => setSelection({ month, day });
  const changeMonth = (date: Date) => {
    const nextMonth = dayKey(date).slice(0, 7);
    if (nextMonth === month || pending) return;
    startTransition(() => router.push(`${ROUTES.studentCalendar}?month=${nextMonth}`, { scroll: false }));
  };
  const marked = (predicate: (item: AgendaTraining) => boolean) => training.filter(predicate).map((item) => new Date(`${item.date}T12:00:00`));
  const firstClassDate = trainingClass?.weekdays.length ? findFirstOccurrenceDate(trainingClass.weekdays, today) : null;

  return <div className="space-y-6" aria-busy={pending}>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-5 rounded-xl bg-card p-4 sm:p-5" aria-labelledby="agenda-month">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="agenda-month" className="text-lg font-semibold capitalize">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="min-h-11" disabled={pending} onClick={() => { setSelection({ month: today.slice(0, 7), day: today }); changeMonth(new Date(`${today}T12:00:00`)); }}>Hoje</Button>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={pending} aria-label="Mês anterior" onClick={() => changeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1, 12))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={pending} aria-label="Próximo mês" onClick={() => changeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1, 12))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          </div>
        </div>
        <Calendar
          mode="single" hideNavigation locale={ptBR} month={monthDate} today={new Date(`${today}T12:00:00`)}
          selected={selectedDay ? new Date(`${selectedDay}T12:00:00`) : undefined}
          onSelect={(date) => setSelection({ month, day: date ? dayKey(date) : null })}
          onMonthChange={changeMonth}
          disabled={pending ? true : { before: monthDate, after: lastDate }}
          modifiers={{ training: marked(() => true), event: events.map((event) => new Date(`${event.date}T12:00:00`)), present: marked((item) => item.status === "present"), absent: marked((item) => item.status === "absent"), excused: marked((item) => item.status === "excused") }}
          components={{ DayButton: AgendaDayButton }}
          classNames={{ root: "w-full", months: "w-full", month: "flex w-full flex-col gap-3", month_caption: "sr-only", week: "mt-1 flex w-full" }}
          className="mx-auto w-full max-w-lg bg-transparent p-0 [--cell-size:--spacing(9)]"
        />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda do calendário">
          <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />Treino</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-info-foreground" aria-hidden="true" />Evento</span>
          <span className="inline-flex items-center gap-1.5"><Check className="size-3 text-success-foreground" aria-hidden="true" />Presença</span>
          <span className="inline-flex items-center gap-1.5"><X className="size-3 text-danger-text" aria-hidden="true" />Falta</span>
          <span className="inline-flex items-center gap-1.5"><Minus className="size-3 text-warning-foreground" aria-hidden="true" />Justificada</span>
        </div>
        <p className="text-sm text-muted-foreground">Selecione um dia para ver os horários e registros.</p>
      </section>

      <aside className="min-w-0 space-y-5 rounded-xl bg-card p-4 sm:p-5" aria-label="Compromissos da agenda">
        {pending ? <p role="status" className="text-sm text-muted-foreground">Carregando mês…</p> : selectedDay ? <div className="space-y-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-base font-semibold"><ReadableDate value={selectedDay} weekday /></h2>
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setSelection({ month, day: null })}>Visão do mês</Button>
          </div>
          {selectedTraining.length || selectedEvents.length ? <div className="space-y-6" aria-label="Atividades do dia">
            {selectedTraining.map((item) => <AgendaTrainingDetail key={item.id} item={item} />)}
            {selectedEvents.map((event) => <AgendaEventDetail key={event.id} event={event} />)}
          </div> : <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>}
        </div> : <AgendaMonthOverview events={events} nextTraining={nextTraining} now={now} onSelect={selectDay} />}
      </aside>
    </div>

    <div className="space-y-6 rounded-xl bg-card p-4 sm:p-5">
      <MonthlyFrequency data={frequency} scheduled={training.filter((item) => item.status === "scheduled" && Date.parse(`${item.date}T${item.endTime}:00-03:00`) >= Date.parse(now)).length} />
      {trainingClass ? <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Grade da turma · {trainingClass.name}</summary><div className="space-y-3 pb-2"><p className="text-muted-foreground">{trainingClass.weekdays.join(", ")} · {trainingClass.start_time} às {trainingClass.end_time}</p>{trainingClass.location ? <p className="text-muted-foreground">{trainingClass.location}</p> : null}{firstClassDate ? <AddToCalendarButton uid={`class-weekly-${trainingClass.$id}`} title={`Taekwondo · ${trainingClass.name}`} date={firstClassDate} startTime={trainingClass.start_time} endTime={trainingClass.end_time} location={trainingClass.location} recurrenceWeekdays={trainingClass.weekdays} fileName={`grade-${trainingClass.$id}`} label="Salvar grade na agenda" variant="ghost" align="start" /> : null}</div></details> : <p className="text-sm text-muted-foreground">Sua turma será vinculada quando a matrícula for aprovada.</p>}
    </div>
  </div>;
}
