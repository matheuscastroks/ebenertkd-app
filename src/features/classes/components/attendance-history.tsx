"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ptBR } from "date-fns/locale";
import {
  Ban,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Minus,
  X
} from "@/components/ui/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  AttendanceEvolutionAreaChart,
  StudentAttendanceChart,
  type AttendanceEvolutionPoint
} from "@/features/classes/components/attendance-chart";
import { attendanceCalendarStatus, type AttendanceCalendarStatus } from "@/features/classes/attendance-calendar-rules";
import type { AttendanceCalendarEntry } from "@/features/classes/types";

const labels: Record<AttendanceCalendarStatus, string> = {
  present: "Presente",
  absent: "Falta",
  excused: "Justificada",
  scheduled: "Aula prevista",
  not_recorded: "Sem chamada",
  cancelled: "Cancelada"
};

const tones = {
  present: "success",
  absent: "danger",
  excused: "warning",
  scheduled: "info",
  not_recorded: "neutral",
  cancelled: "neutral"
} as const;

function buildAttendanceEvolution(entries: AttendanceCalendarEntry[]): AttendanceEvolutionPoint[] {
  const recorded = [...entries]
    .filter((entry) => entry.lesson.status !== "cancelled" && entry.record)
    .sort((a, b) =>
      `${a.lesson.lesson_date}:${a.lesson.start_time}`.localeCompare(
        `${b.lesson.lesson_date}:${b.lesson.start_time}`
      )
    );

  const dayTotals = new Map<string, number>();
  for (const entry of recorded) {
    const day = entry.lesson.lesson_date.slice(0, 10);
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + 1);
  }

  let attended = 0;
  let total = 0;
  const points: AttendanceEvolutionPoint[] = [];
  for (const entry of recorded) {
    total += 1;
    if (entry.record!.status === "present") attended += 1;
    const isoDay = entry.lesson.lesson_date.slice(0, 10);
    const [, monthPart, dayPart] = isoDay.split("-");
    const shortDay = `${dayPart}/${monthPart}`;
    const dateLabel =
      (dayTotals.get(isoDay) ?? 0) > 1
        ? `${shortDay} ${entry.lesson.start_time}`
        : shortDay;
    points.push({
      dateLabel,
      lessonLabel: entry.trainingClass?.name ?? "Treino regular",
      rate: Math.round((attended / total) * 100),
      attended,
      total,
      statusLabel: labels[entry.record!.status]
    });
  }
  return points;
}

export function AttendanceHistory({
  entries,
  summary,
  month,
  basePath
}: {
  entries: AttendanceCalendarEntry[];
  summary: { attended: number; total: number; rate: number };
  month: string;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticMonth, setOptimisticMonth] = useOptimistic(month);
  const firstDate = entries[0]?.lesson.lesson_date.slice(0, 10) ?? `${month}-01`;
  // A seleção vale só para o mês em que foi feita; ao chegar outro mês, volta para o primeiro dia com aula.
  const [selection, setSelection] = useState<{ month: string; date?: Date }>({ month });
  const selected =
    selection.month === month ? selection.date : new Date(`${firstDate}T12:00:00`);
  const setSelected = (date?: Date) => setSelection({ month, date });
  const visibleMonth = useMemo(() => new Date(`${optimisticMonth}-01T12:00:00`), [optimisticMonth]);

  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const byDay = useMemo(() => {
    const result = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = entry.lesson.lesson_date.slice(0, 10);
      result.set(key, [...(result.get(key) ?? []), entry]);
    }
    return result;
  }, [entries]);

  const markedDates = (status: AttendanceCalendarStatus) =>
    [...byDay]
      .filter(([, dayEntries]) =>
        dayEntries.some(
          (entry) => attendanceCalendarStatus(entry.lesson, entry.record?.status) === status
        )
      )
      .map(([key]) => new Date(`${key}T12:00:00`));

  const selectedEntries = selected ? byDay.get(dayKey(selected)) ?? [] : [];

  const changeMonth = (next: Date) => {
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    startTransition(() => {
      setOptimisticMonth(key);
      router.replace(`${basePath}?month=${key}`, { scroll: false });
    });
  };

  const goToPreviousMonth = () => {
    const prev = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1, 12);
    changeMonth(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12);
    changeMonth(next);
  };

  const monthLabel = visibleMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    let scheduled = 0;
    for (const entry of entries) {
      const status = attendanceCalendarStatus(entry.lesson, entry.record?.status);
      if (status === "present") present += 1;
      else if (status === "absent") absent += 1;
      else if (status === "excused") excused += 1;
      else if (status === "scheduled") scheduled += 1;
    }
    return { present, absent, excused, scheduled };
  }, [entries]);

  const evolutionPoints = useMemo(() => buildAttendanceEvolution(entries), [entries]);

  return (
    <div aria-busy={pending} className="space-y-6 transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80">
      {/* Resumo Mensal e Gráficos de Frequência */}
      <section
        aria-labelledby="attendance-summary-title"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 id="attendance-summary-title" className="text-sm font-semibold text-muted-foreground">
              Desempenho no mês de {monthLabel}
            </h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums text-foreground">
                {summary.total ? `${summary.rate}%` : "—"}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {summary.attended} {summary.attended === 1 ? "presença" : "presenças"} em {summary.total} {summary.total === 1 ? "chamada" : "chamadas"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.total
                ? summary.rate >= 75
                  ? "Frequência registrada no mês: pelo menos 75%."
                  : "Frequência registrada no mês: abaixo de 75%."
                : "Ainda sem aulas registradas"}
            </p>
          </div>

          {summary.total > 0 ? (
            <div className="w-full space-y-2 sm:max-w-xs">
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Meta da academia: 75%</span>
                <span className="font-semibold tabular-nums text-foreground">{summary.rate}%</span>
              </div>
              <Progress
                value={summary.rate}
                className="h-2.5"
                aria-label={`Taxa de presença de ${summary.rate}%`}
              />
            </div>
          ) : null}
        </div>

        {summary.total > 0 ? (
          <div
            className={
              evolutionPoints.length >= 2
                ? "grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0"
                : "grid"
            }
          >
            {evolutionPoints.length >= 2 ? (
              <div className="min-w-0 space-y-3 p-5">
                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold leading-snug text-foreground">
                    Evolução da frequência
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Acompanhamento acumulado ao longo das chamadas do mês.
                  </p>
                </div>
                <AttendanceEvolutionAreaChart points={evolutionPoints} />
              </div>
            ) : null}

            <div className="min-w-0 space-y-3 p-5">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  Composição do mês
                </h3>
                <p className="text-sm text-muted-foreground">
                  Proporção entre presenças, faltas, justificativas{counts.scheduled > 0 ? " e aulas previstas" : ""}.
                </p>
              </div>
              <StudentAttendanceChart
                present={entries.length > 0 ? counts.present : summary.attended}
                absent={counts.absent}
                excused={counts.excused}
                scheduled={counts.scheduled}
                rate={summary.rate}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Grade Unificada com Calendário Compacto e Detalhes do Dia */}
      <section
        aria-labelledby="attendance-calendar-title"
        className="grid divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:grid-cols-[20rem_minmax(0,1fr)] lg:divide-x lg:divide-y-0"
      >
        {/* Coluna Esquerda: Calendário ajustado à largura natural */}
        <div className="min-w-0 space-y-3.5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h2 id="attendance-calendar-title" className="flex items-center gap-2 text-base font-semibold leading-snug text-foreground">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Calendário de treinos
              </h2>
              <p className="text-xs text-muted-foreground">
                Toque em um dia para ver os detalhes.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToPreviousMonth}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToNextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <Calendar
            mode="single"
            hideNavigation
            selected={selected}
            onSelect={setSelected}
            month={visibleMonth}
            onMonthChange={changeMonth}
            locale={ptBR}
            modifiers={{
              present: markedDates("present"),
              absent: markedDates("absent"),
              excused: markedDates("excused"),
              scheduled: markedDates("scheduled"),
              not_recorded: markedDates("not_recorded"),
              cancelled: markedDates("cancelled")
            }}
            modifiersClassNames={{
              present: "[&>button]:bg-success/20 [&>button]:text-success-foreground [&>button]:font-semibold",
              absent: "[&>button]:bg-destructive/15 [&>button]:text-destructive [&>button]:font-semibold",
              excused: "[&>button]:bg-warning/20 [&>button]:text-warning-foreground",
              scheduled: "[&>button]:bg-info/15 [&>button]:text-info",
              not_recorded: "[&>button]:ring-1 [&>button]:ring-muted-foreground/50",
              cancelled: "[&>button]:line-through [&>button]:text-muted-foreground"
            }}
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "flex w-full flex-col gap-3",
              month_caption: "flex h-7 w-full items-center justify-center capitalize",
              month_grid: "w-full border-collapse",
              week: "mt-1.5 flex w-full"
            }}
            className="mx-auto w-full max-w-[18.5rem] bg-transparent p-0 [--cell-size:2.25rem]"
          />

          {/* Legenda Visual Compacta */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Check className="size-3 text-success" aria-hidden="true" /> Presença
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <X className="size-3 text-destructive" aria-hidden="true" /> Falta
            </span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Minus className="size-3 text-warning" aria-hidden="true" /> Justificada
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3 text-info" aria-hidden="true" /> Prevista
            </span>
            <span className="flex items-center gap-1">
              <Ban className="size-3 text-muted-foreground" aria-hidden="true" /> Cancelada
            </span>
          </div>
        </div>

        {/* Coluna Direita: Atividades do Dia Selecionado (ampliada) */}
        <div className="flex min-w-0 flex-col justify-between gap-5 p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold capitalize leading-snug text-foreground">
                  {selected
                    ? selected.toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long"
                      })
                    : "Selecione uma data no calendário"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedEntries.length
                    ? `${selectedEntries.length} ${selectedEntries.length === 1 ? "aula registrada" : "aulas registradas"} neste dia`
                    : "Nenhuma aula programada ou chamada para este dia"}
                </p>
              </div>
              {selectedEntries.length > 0 ? (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {monthLabel}
                </span>
              ) : null}
            </div>

            {selectedEntries.length > 0 ? (
              <div className="divide-y divide-border">
                {selectedEntries.map(({ record, lesson, trainingClass }) => {
                  const status = attendanceCalendarStatus(lesson, record?.status);
                  return (
                    <div
                      key={lesson.$id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {trainingClass?.name ?? "Treino regular"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock3 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            {lesson.start_time} às {lesson.end_time}
                          </span>
                          {trainingClass?.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                              {trainingClass.location}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <StatusBadge tone={tones[status]}>
                        {labels[status]}
                      </StatusBadge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CalendarCheck2 className="mb-2 size-8 stroke-1 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">Sem atividades neste dia</p>
                <p className="mt-0.5 max-w-sm text-sm">
                  Selecione os dias com marcadores no calendário ao lado para ver o registro de presença.
                </p>
              </div>
            )}
          </div>

          {entries.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aulas registradas em {monthLabel}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {entries.slice(0, 6).map(({ record, lesson, trainingClass }) => {
                  const isoDay = lesson.lesson_date.slice(0, 10);
                  const entryDate = new Date(`${isoDay}T12:00:00`);
                  const isCurrent = selected ? dayKey(selected) === isoDay : false;
                  const status = attendanceCalendarStatus(lesson, record?.status);
                  return (
                    <button
                      key={lesson.$id}
                      type="button"
                      onClick={() => setSelected(entryDate)}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors duration-(--duration-quick) ${
                        isCurrent
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border bg-background/60 text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">
                        <span className="tabular-nums text-muted-foreground">
                          {entryDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        {" · "}
                        {trainingClass?.name ?? "Treino"}
                      </span>
                      <StatusBadge tone={tones[status]}>
                        {labels[status]}
                      </StatusBadge>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
