import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { getTrainingClass } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { formatNextTraining } from "@/features/families/next-training";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { buildPendencies, primaryPendency } from "@/features/families/pendencies";
import { PendencyList } from "@/features/families/components/pendency-list";
import { OnboardingTrigger } from "@/features/onboarding/components/onboarding-trigger";
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

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
    <Suspense fallback={null}><OnboardingTrigger role={profile.role} userName={profile.full_name} hasCompletedOnboarding={Boolean(profile.onboarding_completed_at)} /></Suspense>
    <div className="min-w-0 space-y-6">
      <Card aria-labelledby="next-training-title">
        <CardHeader><CardTitle id="next-training-title" className="text-sm font-medium text-muted-foreground">Próximo treino</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatNextTraining(next)}</p>
            <p className="text-sm text-muted-foreground">
              {trainingClass || student?.training_class
                ? `${trainingClass?.name ?? student?.training_class} · ${trainingClass?.location || "Local não informado"}`
                : "A turma é definida pelo professor ao aprovar a matrícula."}
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="tabular-nums">{summary.total ? `Frequência ${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</p>
            <Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.studentAttendance}>Ver frequência</Link></Button>
          </div>
        </CardContent>
      </Card>
      <section aria-labelledby="pendencies-title" className="space-y-3">
        <h2 id="pendencies-title" className="text-base font-semibold">Pendências</h2>
        <Card><CardContent>
          <PendencyList items={pendencies} primaryKey={primary?.id} emptyLabel="Tudo em dia. Nada precisa da sua atenção agora." />
        </CardContent></Card>
      </section>
    </div>
    <div className="min-w-0 space-y-6">
      <GraduationCard currentBelt={student?.current_belt} gub={student?.gub} startedAtTkd={student?.started_at_tkd} />
      {aside}
    </div>
  </div>;
}
