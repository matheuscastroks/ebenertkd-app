import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardGridSkeleton } from "@/components/skeletons";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { listGuardianMinors } from "@/features/families/service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { OnboardingTrigger } from "@/features/onboarding/components/onboarding-trigger";
import { OnboardingChecklist } from "@/features/onboarding/components/onboarding-checklist";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { formatBrl } from "@/lib/money";
import {
  guardianAttendancePath,
  guardianBillingPath,
  guardianContractsPath,
  guardianEnrollmentPath,
  ROUTES
} from "@/lib/navigation/routes";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  UserPlus
} from "lucide-react";

async function GuardianMinorsOverview({ guardian }: { guardian: Profile }) {
  const minors = await listGuardianMinors(guardian);

  if (minors.length === 0) {
    return (
      <EmptyState
        title="Nenhum dependente cadastrado"
        description="Ainda não há alunos menores vinculados à sua conta. Cadastre seu primeiro dependente para gerenciar matrícula, treinos e financeiro."
        action={
          <Button asChild>
            <Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link>
          </Button>
        }
      />
    );
  }

  const [classes, photoIds, minorsData] = await Promise.all([
    listTrainingClasses(true),
    listProfilePhotoDocumentIds(minors.map((minor) => minor.$id)),
    Promise.all(
      minors.map(async (minor) => {
        const [history, charges, contracts] = await Promise.all([
          getAttendanceHistory(guardian, minor.$id),
          listChargesForStudent(guardian, minor.$id).catch(() => []),
          listStudentContracts(guardian, minor.$id).catch(() => [])
        ]);
        return { minor, history, charges, contracts };
      })
    )
  ]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {minorsData.map(({ minor, history, charges, contracts }) => {
        const trainingClass = classes.find(
          (c) => c.$id === history.student?.training_class_id
        );
        const nextSchedule = trainingClass ? getNextClassSchedule(trainingClass) : null;
        const pendingContract = contracts.find((c) => c.status === "pending_signature");
        const pendingCharge = charges.find(
          (c) => c.status === "pending" || c.status === "overdue"
        );

        return (
          <Card key={minor.$id} className="overflow-hidden hover:border-primary/40 transition-colors">
            <CardHeader className="space-y-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StudentAvatar
                    name={minor.full_name}
                    photoDocumentId={photoIds.get(minor.$id)}
                    className="size-11"
                  />
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base font-semibold">
                      {minor.full_name}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <BeltBadge
                        belt={history.student?.current_belt}
                        gub={history.student?.gub}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {history.student?.status === "active" ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0">
                    Ativo
                  </Badge>
                ) : history.student?.status === "submitted" ? (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
                    Em análise
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground shrink-0">
                    Incompleta
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              <div className="rounded-xl border border-border/50 bg-surface-recessed/60 p-3.5 space-y-2 text-xs sm:text-sm depth-recessed">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Próximo treino:
                  </span>
                  <span className="font-medium text-foreground">
                    {nextSchedule ? (
                      nextSchedule.isToday ? (
                        <span className="text-primary font-semibold">Hoje ({nextSchedule.startTime})</span>
                      ) : (
                        `${nextSchedule.dayLabel} às ${nextSchedule.startTime}`
                      )
                    ) : (
                      "Sem horários definidos"
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Frequência recente:
                  </span>
                  <span className="font-medium text-foreground">
                    {history.summary.total ? `${history.summary.rate}% de presença` : "Sem registros"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    Mensalidade:
                  </span>
                  <span className="font-medium text-foreground">
                    {pendingCharge ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {formatBrl(pendingCharge.amount_cents)} pendente
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Em dia
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {pendingContract ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs sm:text-sm depth-raised">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 min-w-0">
                    <FileSignature className="size-4 shrink-0" />
                    <span className="truncate">Contrato de matrícula pendente</span>
                  </div>
                  <Button asChild size="sm" className="h-8 text-xs shrink-0 font-medium">
                    <Link href={guardianContractsPath(minor.$id)}>Assinar</Link>
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <Button asChild variant="outline" size="sm" className="h-9 text-xs font-medium">
                  <Link href={guardianEnrollmentPath(minor.$id)}>Ficha</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 text-xs font-medium">
                  <Link href={guardianAttendancePath(minor.$id)}>Frequência</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 text-xs font-medium">
                  <Link href={guardianBillingPath(minor.$id)}>Financeiro</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 text-xs font-medium">
                  <Link href={guardianContractsPath(minor.$id)}>Contratos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian).catch(() => []);

  const guardianChecklistItems = [
    { id: "1", label: "Acesso de responsável verificado", href: ROUTES.guardian, completed: true },
    { id: "2", label: "Cadastrar ou vincular dependentes", href: ROUTES.guardianDependents, completed: minors.length > 0 },
    { id: "3", label: "Acompanhar chamada e frequência", href: ROUTES.guardian, completed: false },
    { id: "4", label: "Consultar mensalidades e chave PIX", href: ROUTES.guardian, completed: false },
  ];

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardian}
      title="Meus dependentes"
      subtitle="Acompanhe o treino, frequência e pagamentos da família."
      headerActions={
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.guardianDependents}>
            <UserPlus aria-hidden="true" />
            Adicionar dependente
          </Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={null}>
          <OnboardingTrigger
            role="guardian"
            userName={guardian.full_name}
            hasCompletedOnboarding={Boolean(guardian.onboarding_completed_at)}
          />
        </Suspense>

        <OnboardingChecklist role="guardian" items={guardianChecklistItems} />

        <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}>
          <GuardianMinorsOverview guardian={guardian} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
