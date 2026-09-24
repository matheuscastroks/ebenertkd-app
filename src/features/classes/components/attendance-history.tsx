import { CalendarCheck2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AttendanceRecord, Lesson, TrainingClass } from "@/features/classes/types";

const labels = { present: "Presente", absent: "Falta", excused: "Justificada" } as const;
const tones = { present: "success", absent: "danger", excused: "warning" } as const;

export function AttendanceHistory({ entries, summary }: { entries: { record: AttendanceRecord; lesson: Lesson; trainingClass?: TrainingClass }[]; summary: { attended: number; total: number; rate: number } }) {
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="text-base">Resumo de frequência</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-end justify-between gap-3"><p className="text-3xl font-semibold tabular-nums">{summary.rate}%</p><p className="text-sm text-muted-foreground">{summary.attended} presenças em {summary.total} aulas</p></div><Progress value={summary.rate} aria-label={`Frequência de ${summary.rate}%`} /></CardContent></Card>
    {entries.length === 0 ? <EmptyState icon={<CalendarCheck2 className="size-5" aria-hidden="true" />} title="Nenhuma chamada registrada" description="As aulas concluídas aparecerão aqui." /> : <div className="space-y-3">{entries.map(({ record, lesson, trainingClass }) => <Card key={record.$id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{trainingClass?.name ?? "Treino"}</p><p className="text-sm text-muted-foreground">{new Date(lesson.lesson_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {lesson.start_time}–{lesson.end_time}</p></div><StatusBadge tone={tones[record.status]}>{labels[record.status]}</StatusBadge></CardContent></Card>)}</div>}
  </div>;
}
