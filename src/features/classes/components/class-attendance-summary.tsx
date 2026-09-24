import { StudentAvatar } from "@/features/students/components/student-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Student } from "@/features/students/types";

export function ClassAttendanceSummary({ month, lessonCount, rows }: { month: string; lessonCount: number; rows: { student: Student; photoDocumentId?: string; present: number; total: number; percentage: number }[] }) {
  const label = new Date(`${month}-01T12:00:00.000Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return <Card><CardHeader><CardTitle>Frequência da turma</CardTitle><CardDescription>{label} · {lessonCount} aula{lessonCount === 1 ? "" : "s"} concluída{lessonCount === 1 ? "" : "s"}</CardDescription></CardHeader><CardContent>{rows.length === 0 ? <p className="text-sm text-muted-foreground">Conclua a primeira chamada do mês para ver o resumo.</p> : <div className="space-y-4">{rows.map((row) => <div key={row.student.$id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center"><div className="flex items-center gap-3"><StudentAvatar name={row.student.full_name} photoDocumentId={row.photoDocumentId} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium">{row.student.full_name}</p><p className="text-xs text-muted-foreground">{row.present} de {row.total} presenças</p></div></div><div className="flex items-center gap-3"><Progress value={row.percentage} aria-label={`Frequência de ${row.student.full_name}: ${row.percentage}%`} /><span className="w-10 text-right text-sm font-medium tabular-nums">{row.percentage}%</span></div></div>)}</div>}</CardContent></Card>;
}
