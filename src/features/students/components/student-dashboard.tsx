import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getOutstandingCharge, outstandingLabel } from "@/features/billing/outstanding";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { getTrainingClass } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { OnboardingTrigger } from "@/features/onboarding/components/onboarding-trigger";
import { GraduationCard } from "./graduation-card";
import { ROUTES } from "@/lib/navigation/routes";
import { formatBrl } from "@/lib/money";

export async function StudentDashboardDynamic({ profile, minor }: { profile: Profile; minor: boolean }) {
  const [attendance, charges] = await Promise.all([getAttendanceHistory(profile), minor ? Promise.resolve([]) : listChargesForStudent(profile)]);
  const student = attendance.student;
  const trainingClass = student?.training_class_id ? await getTrainingClass(student.training_class_id) : null;
  const next = trainingClass ? getNextClassSchedule(trainingClass) : null;
  const outstanding = getOutstandingCharge(charges);
  return <div className="space-y-4">
    <Suspense fallback={null}><OnboardingTrigger role={profile.role} userName={profile.full_name} hasCompletedOnboarding={Boolean(profile.onboarding_completed_at)} /></Suspense>
    {!student || student.status === "draft" ? <section className="space-y-2 rounded-xl border border-border p-4 text-sm">
      <h2 className="font-semibold">Ficha de matrícula incompleta</h2><p>Complete sua ficha para que o professor possa analisar sua matrícula.</p>
      <Button asChild className="min-h-11"><Link href={ROUTES.studentEnrollment}>Preencher matrícula</Link></Button>
    </section> : student.status === "submitted" ? <p className="text-sm">Sua matrícula está em análise pelo professor.</p> : null}
    <Card><CardHeader><CardTitle>Próximo treino</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
      <p className="font-medium">{next ? `${next.isToday ? "Hoje" : next.dayLabel}, ${next.startTime} às ${next.endTime}` : "Horário ainda não definido"}</p>
      <p className="text-muted-foreground">{trainingClass?.name ?? student?.training_class ?? "Turma em definição"} · {trainingClass?.location || "Local não informado"}</p>
      <p>{attendance.summary.total ? `Frequência: ${attendance.summary.rate}% · ${attendance.summary.attended} presenças em ${attendance.summary.total} aulas` : "Ainda sem aulas registradas"}</p>
      <Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.studentAttendance}>Ver frequência</Link></Button>
    </CardContent></Card>
    {!minor && outstanding ? <Card><CardHeader><CardTitle>Mensalidade</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
      <StatusBadge tone={outstanding.status === "overdue" ? "danger" : outstanding.status === "proof_under_review" ? "info" : "warning"}>{outstandingLabel(outstanding)}</StatusBadge>
      <p>{formatBrl(outstanding.amount_cents)} · Vencimento {new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
      <Button asChild variant={outstanding.status === "proof_under_review" ? "outline" : "default"} className="min-h-11"><Link href={ROUTES.studentBilling}>{outstanding.status === "proof_under_review" ? "Ver pagamento" : "Pagar mensalidade"}</Link></Button>
    </CardContent></Card> : null}
    <GraduationCard currentBelt={student?.current_belt} gub={student?.gub} startedAtTkd={student?.started_at_tkd} attendanceRate={attendance.summary.total ? attendance.summary.rate : undefined} />
  </div>;
}
