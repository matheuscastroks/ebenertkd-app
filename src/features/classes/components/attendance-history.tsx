"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { attendanceCalendarStatus, type AttendanceCalendarStatus } from "@/features/classes/attendance-calendar-rules";
import type { AttendanceCalendarEntry } from "@/features/classes/types";
import { cn } from "@/lib/utils";

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
  const firstDate = entries[0]?.lesson.lesson_date.slice(0, 10) ?? `${month}-01`;
  const [selected, setSelected] = useState<Date | undefined>(new Date(`${firstDate}T12:00:00`));
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date(`${month}-01T12:00:00`));

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
    setVisibleMonth(next);
    setSelected(undefined);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    router.replace(`${basePath}?month=${key}`, { scroll: false });
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

  return (
    <div className="space-y-6">
      {/* Resumo Mensal de Frequência */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Desempenho no mês de {monthLabel}
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {summary.total ? `${summary.rate}%` : "100%"}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {summary.attended} {summary.attended === 1 ? "presença" : "presenças"} em {summary.total} {summary.total === 1 ? "chamada" : "chamadas"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.total
                ? summary.rate >= 75
                  ? "Excelente assiduidade! Frequência suficiente para participar de exames de faixa."
                  : "Atenção: frequência abaixo do recomendado de 75% para exames de graduação."
                : "Sem chamadas registradas até o momento neste mês."}
            </p>
          </div>

          <div className="w-full sm:max-w-xs space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Meta da academia: 75%</span>
              <span className="font-semibold text-foreground">{summary.rate}%</span>
            </div>
            <Progress
              value={summary.rate}
              className="h-2.5"
              aria-label={`Taxa de presença de ${summary.rate}%`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grade com Calendário e Detalhes do Dia */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
        {/* Card do Calendário */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                  Calendário de treinos
                </CardTitle>
                <CardDescription className="text-xs">
                  Toque em um dia para inspecionar os detalhes da aula e a chamada.
                </CardDescription>
              </div>

              <div className="flex items-center gap-1">
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
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-x-auto pb-1">
              <Calendar
                mode="single"
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
                  present: "[&>button]:bg-success/20 [&>button]:text-success-foreground [&>button]:font-bold",
                  absent: "[&>button]:bg-destructive/15 [&>button]:text-destructive [&>button]:font-bold",
                  excused: "[&>button]:bg-warning/20 [&>button]:text-warning-foreground",
                  scheduled: "[&>button]:bg-info/15 [&>button]:text-info",
                  not_recorded: "[&>button]:ring-1 [&>button]:ring-muted-foreground/50",
                  cancelled: "[&>button]:line-through [&>button]:text-muted-foreground"
                }}
                className="mx-auto w-fit p-1"
              />
            </div>

            {/* Legenda Visual */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Check className="size-3.5 text-success" aria-hidden="true" /> Presença
              </span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <X className="size-3.5 text-destructive" aria-hidden="true" /> Falta
              </span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Minus className="size-3.5 text-warning" aria-hidden="true" /> Justificada
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-info" aria-hidden="true" /> Aula prevista
              </span>
              <span className="flex items-center gap-1.5">
                <Ban className="size-3.5 text-muted-foreground" aria-hidden="true" /> Cancelada
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Detalhes do Dia Selecionado */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selected
                ? selected.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                  })
                : "Selecione uma data no calendário"}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedEntries.length
                ? `${selectedEntries.length} ${selectedEntries.length === 1 ? "aula registrada" : "aulas registradas"} neste dia`
                : "Nenhuma aula programada ou chamada para este dia"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {selectedEntries.length > 0 ? (
              selectedEntries.map(({ record, lesson, trainingClass }) => {
                const status = attendanceCalendarStatus(lesson, record?.status);
                return (
                  <div
                    key={lesson.$id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {trainingClass?.name ?? "Treino regular"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
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
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CalendarCheck2 className="size-8 stroke-1 mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm font-medium">Sem atividades neste dia</p>
                <p className="text-xs mt-0.5">Selecione os dias com marcadores no calendário acima para ver o registro de presença.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
