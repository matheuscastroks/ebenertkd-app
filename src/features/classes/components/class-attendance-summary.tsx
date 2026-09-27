import { StudentAvatar } from "@/features/students/components/student-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Student } from "@/features/students/types";

export function ClassAttendanceSummary({ month, lessonCount, rows }: { month: string; lessonCount: number; rows: { student: Student; photoDocumentId?: string; present: number; total: number; percentage: number }[] }) {
  const label = new Date(`${month}-01T12:00:00.000Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência da turma</CardTitle>
        <CardDescription>{label} · {lessonCount} aula{lessonCount === 1 ? "" : "s"} concluída{lessonCount === 1 ? "" : "s"}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Conclua a primeira chamada do mês para ver o resumo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] table-auto border-collapse">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Aluno</th>
                  <th className="px-3 py-2 text-left">Presenças</th>
                  <th className="px-3 py-2 text-left">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student.$id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="flex items-center gap-2 px-3 py-2">
                      <StudentAvatar name={row.student.full_name} photoDocumentId={row.photoDocumentId} size="sm" />
                      <span className="font-medium truncate text-sm">{row.student.full_name}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {row.present} de {row.total} presenças
                    </td>
                    <td className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                      <Progress value={row.percentage} className="h-2 w-24" aria-label={`Frequência de ${row.student.full_name}: ${row.percentage}%`} />
                      <span className="tabular-nums">{row.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
