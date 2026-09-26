"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ptBR } from "date-fns/locale";
import { Check, Minus, X, Clock3, Ban } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { attendanceCalendarStatus, type AttendanceCalendarStatus } from "@/features/classes/attendance-calendar-rules";
import type { AttendanceCalendarEntry } from "@/features/classes/types";

const labels: Record<AttendanceCalendarStatus, string> = { present: "Presente", absent: "Falta", excused: "Justificada", scheduled: "Aula prevista", not_recorded: "Sem chamada", cancelled: "Cancelada" };
const tones = { present: "success", absent: "danger", excused: "warning", scheduled: "info", not_recorded: "neutral", cancelled: "neutral" } as const;

export function AttendanceHistory({ entries, summary, month, basePath }: { entries: AttendanceCalendarEntry[]; summary: { attended: number; total: number; rate: number }; month: string; basePath: string }) {
  const router = useRouter();
  const firstDate = entries[0]?.lesson.lesson_date.slice(0, 10) ?? `${month}-01`;
  const [selected, setSelected] = useState<Date | undefined>(new Date(`${firstDate}T12:00:00`));
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date(`${month}-01T12:00:00`));
  const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const byDay = useMemo(() => {
    const result = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = entry.lesson.lesson_date.slice(0, 10);
      result.set(key, [...(result.get(key) ?? []), entry]);
    }
    return result;
  }, [entries]);
  const markedDates = (status: AttendanceCalendarStatus) => [...byDay].filter(([, dayEntries]) => dayEntries.some((entry) => attendanceCalendarStatus(entry.lesson, entry.record?.status) === status)).map(([key]) => new Date(`${key}T12:00:00`));
  const selectedEntries = selected ? byDay.get(dayKey(selected)) ?? [] : [];
  const changeMonth = (next: Date) => {
    setVisibleMonth(next);
    setSelected(undefined);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    router.replace(`${basePath}?month=${key}`, { scroll: false });
  };

  return <div className="space-y-5">
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm text-muted-foreground">Frequência em {new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p><p className="text-3xl font-semibold tabular-nums">{summary.total ? `${summary.rate}%` : "—"}</p><p className="text-sm text-muted-foreground">{summary.attended} presenças em {summary.total} chamadas</p></div><Progress className="w-full max-w-52" value={summary.rate} aria-label={`Frequência de ${summary.rate}%`} /></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <Card><CardHeader><CardTitle className="text-base">Calendário de aulas</CardTitle></CardHeader><CardContent className="space-y-4"><Calendar mode="single" selected={selected} onSelect={setSelected} month={visibleMonth} onMonthChange={changeMonth} locale={ptBR} modifiers={{ present: markedDates("present"), absent: markedDates("absent"), excused: markedDates("excused"), scheduled: markedDates("scheduled"), not_recorded: markedDates("not_recorded"), cancelled: markedDates("cancelled") }} modifiersClassNames={{ present: "[&>button]:bg-success/20 [&>button]:text-success-foreground", absent: "[&>button]:bg-destructive/15 [&>button]:text-destructive", excused: "[&>button]:bg-warning/20", scheduled: "[&>button]:bg-info/15", not_recorded: "[&>button]:ring-1 [&>button]:ring-muted-foreground/50", cancelled: "[&>button]:line-through [&>button]:text-muted-foreground" }} className="mx-auto w-fit" /><div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Check className="size-3 text-success" /> Presença</span><span className="flex items-center gap-1"><X className="size-3 text-destructive" /> Falta</span><span className="flex items-center gap-1"><Minus className="size-3 text-warning" /> Justificada</span><span className="flex items-center gap-1"><Clock3 className="size-3 text-info" /> Prevista</span><span className="flex items-center gap-1"><Ban className="size-3" /> Cancelada</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">{selected ? selected.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "Escolha um dia"}</CardTitle></CardHeader><CardContent className="space-y-3">{selectedEntries.length ? selectedEntries.map(({ record, lesson, trainingClass }) => { const status = attendanceCalendarStatus(lesson, record?.status); return <div key={lesson.$id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="font-medium">{trainingClass?.name ?? "Treino"}</p><p className="text-sm text-muted-foreground">{lesson.start_time}–{lesson.end_time}</p></div><StatusBadge tone={tones[status]}>{labels[status]}</StatusBadge></div>; }) : <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada neste dia.</p>}</CardContent></Card>
    </div>
  </div>;
}
