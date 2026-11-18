import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarCheck2Icon } from "@/components/ui/calendar-check-2";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { StudentAttendanceChart } from "@/features/classes/components/attendance-chart";
import { getTrainingClass } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { formatNextTraining } from "@/features/families/next-training";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { buildPendencies, primaryPendency } from "@/features/families/pendencies";
import { PendencyList } from "@/features/families/components/pendency-list";
import { GraduationCard } from "./graduation-card";
import { ROUTES, studentContractPath } from "@/lib/navigation/routes";

/**
 * Visão geral do aluno. Primário: próximo treino. Secundário: pendências e faixa.
 * Terciário: atalhos para dados e documentos (`aside`). O menor nunca consulta nem vê financeiro.
 */
export async function StudentDashboardDynamic({ profile, minor, aside }: { profile: Profile; minor: boolean; aside?: ReactNode }) {
  const [attendance, charges, contracts] = await Promise.all([
    getAttendanceHistory(profile),
    minor ? Promise.resolve("hidden" as const) : listChargesForStudent(profile).catch(() => null),
    minor ? Promise.resolve("hidden" as const) : listStudentContracts(profile).catch(() => null)
  ]);
  const student = attendance.student;
  const trainingClass = student?.training_class_id ? await getTrainingClass(student.training_class_id).catch(() => null) : null;
  const next = trainingClass ? getNextClassSchedule(trainingClass) : null;
  const pendencies = buildPendencies({
    studentStatus: student?.status, charges, contracts, canSign: !minor,
    links: { enrollment: ROUTES.studentEnrollment, billing: ROUTES.studentBilling, contracts: ROUTES.studentContracts, contract: studentContractPath }
  });
  const primary = primaryPendency(pendencies);
  const { summary } = attendance;
  const presentCount = attendance.entries.length > 0
    ? attendance.entries.filter(({ record }) => record.status === "present").length
    : summary.attended;
  const absentCount = attendance.entries.length > 0
    ? attendance.entries.filter(({ record }) => record.status === "absent").length
    : Math.max(0, summary.total - summary.attended);
  const excusedCount = attendance.entries.filter(({ record }) => record.status === "excused").length;

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="next-training-title" className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-1.5 p-5">
          <h2 id="next-training-title" className="text-sm font-medium text-muted-foreground">Próximo treino</h2>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatNextTraining(next)}</p>
          <p className="text-sm text-muted-foreground">
            {trainingClass || student?.training_class
              ? `${trainingClass?.name ?? student?.training_class} · ${trainingClass?.location || "Local não informado"}`
              : "A turma é definida pelo professor ao aprovar a matrícula."}
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="tabular-nums">{summary.total ? `Frequência ${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</p>
            <Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.studentAttendance}><CalendarCheck2Icon aria-hidden="true" />Ver frequência</Link></Button>
          </div>
          {summary.total > 0 ? (
            <StudentAttendanceChart
              present={presentCount}
              absent={absentCount}
              excused={excusedCount}
              rate={summary.rate}
              compact
            />
          ) : null}
        </div>
      </section>
      <section aria-labelledby="pendencies-title" className="space-y-2.5">
        <h2 id="pendencies-title" className="text-base font-semibold">Pendências</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <PendencyList items={pendencies} primaryKey={primary?.id} emptyLabel="Tudo em dia. Nada precisa da sua atenção agora." />
        </div>
      </section>
    </div>
    <div className="min-w-0 space-y-6">
      <GraduationCard currentBelt={student?.current_belt} gub={student?.gub} startedAtTkd={student?.started_at_tkd} />
      {aside}
    </div>
  </div>;
}
