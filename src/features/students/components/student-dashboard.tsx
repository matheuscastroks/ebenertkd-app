import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { getTrainingClass } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { formatNextTraining } from "@/features/families/next-training";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { buildPendencies, primaryPendency } from "@/features/families/pendencies";
import { PendencyList } from "@/features/families/components/pendency-list";
import { getPolicy } from "@/features/academy/config-service";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import { saoPauloToday } from "@/lib/dates";
import { GraduationCard } from "./graduation-card";
import { ROUTES, studentContractPath } from "@/lib/navigation/routes";

/**
 * Início do aluno, em uma coluna: pendências (só quando houver) → próximo treino com a
 * frequência em uma linha → faixa. O menor nunca consulta nem vê financeiro.
 */
export async function StudentDashboardDynamic({ profile, minor, footer }: { profile: Profile; minor: boolean; footer?: ReactNode }) {
  const [attendance, charges, contracts] = await Promise.all([
    getAttendanceHistory(profile),
    minor ? Promise.resolve("hidden" as const) : listChargesForStudent(profile).catch(() => null),
    minor ? Promise.resolve("hidden" as const) : listStudentContracts(profile).catch(() => null)
  ]);
  const student = attendance.student;
  const [trainingClass, latestParq, compliancePolicy] = await Promise.all([
    student?.training_class_id ? getTrainingClass(student.training_class_id).catch(() => null) : Promise.resolve(null),
    student?.$id ? getLatestParqForStudent(student.$id).catch(() => null) : Promise.resolve(null),
    getPolicy("compliance"),
  ]);
  const parqAssessment = student?.$id ? evaluateParqStatus(latestParq, saoPauloToday(), compliancePolicy) : null;
  const next = trainingClass ? getNextClassSchedule(trainingClass) : null;
  const pendencies = buildPendencies({
    studentStatus: student?.status,
    charges,
    contracts,
    parqStatus: parqAssessment?.status,
    parqExpiresAt: parqAssessment?.expiresAt,
    canSign: !minor,
    links: {
      enrollment: ROUTES.studentEnrollment,
      billing: ROUTES.studentBilling,
      contracts: ROUTES.studentContracts,
      contract: studentContractPath,
      parq: ROUTES.studentParq,
    }
  });
  const primary = primaryPendency(pendencies);
  const { summary } = attendance;

  return <div className="mx-auto max-w-3xl space-y-6">
    {pendencies.length > 0 ? (
      <section aria-labelledby="pendencies-title" className="space-y-2.5">
        <h2 id="pendencies-title" className="text-base font-semibold">Pendências</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <PendencyList items={pendencies} primaryKey={primary?.id} />
        </div>
      </section>
    ) : null}

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
      <Link
        href={ROUTES.studentAttendance}
        className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors duration-(--duration-quick) hover:bg-muted motion-reduce:transition-none"
      >
        <span className="tabular-nums">{summary.total ? `Frequência ${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </section>

    {pendencies.length === 0 ? <p className="text-sm text-muted-foreground">Tudo em dia. Nada precisa da sua atenção agora.</p> : null}

    <GraduationCard rankKey={student?.rank_key} startedAtTkd={student?.started_at_tkd} />
    {footer}
  </div>;
}
