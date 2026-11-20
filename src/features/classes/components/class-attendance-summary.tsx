import { StudentAvatar } from "@/features/students/components/student-avatar";
import { Progress } from "@/components/ui/progress";
import { ClassAttendanceChart } from "@/features/classes/components/attendance-chart";
import type { Student } from "@/features/students/types";

export function ClassAttendanceSummary({ month, lessonCount, rows }: { month: string; lessonCount: number; rows: { student: Student; photoDocumentId?: string; present: number; total: number; percentage: number }[] }) {
  const label = new Date(`${month}-01T12:00:00.000Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <section className="space-y-3" aria-labelledby="frequencia-turma">
      <div>
        <h2 id="frequencia-turma" className="text-base font-semibold">Frequência da turma</h2>
        <p className="text-sm text-muted-foreground">{label} · {lessonCount} aula{lessonCount === 1 ? "" : "s"} concluída{lessonCount === 1 ? "" : "s"}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Conclua a primeira chamada do mês para ver o resumo.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <ClassAttendanceChart
              rows={rows.map((r) => ({
                name: r.student.full_name,
                percentage: r.percentage,
                present: r.present,
                total: r.total
              }))}
            />
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {rows.map((row) => (
              <li key={row.student.$id} className="flex items-center gap-3 p-4">
                <StudentAvatar name={row.student.full_name} photoDocumentId={row.photoDocumentId} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{row.present} de {row.total} presenças</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Progress value={row.percentage} className="hidden h-2 w-24 sm:block" aria-label={`Frequência de ${row.student.full_name}: ${row.percentage}%`} />
                  <span className="w-11 text-right text-sm font-medium tabular-nums">{row.percentage}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
