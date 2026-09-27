import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getTodayWeekday } from "@/features/classes/schedule";
import { listExamEvents } from "@/features/exams/service";
import {
  countEnrollmentsRequiringReview,
  listEnrollmentsForReview,
} from "@/features/students/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { OnboardingTrigger } from "@/features/onboarding/components/onboarding-trigger";
import { OnboardingChecklist } from "@/features/onboarding/components/onboarding-checklist";
import { CardGridSkeleton, MetricCardsSkeleton } from "@/components/skeletons";
import {
  AlertCircle,
  Award,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
  Megaphone,
  UserCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

// --- Componente Assíncrono 1: Tarefas Urgentes ---
async function UrgentTasksSection() {
  const [pendingEnrollmentsCount, pendingEnrollmentsData, pendingBillingData] = await Promise.all([
    countEnrollmentsRequiringReview(),
    listEnrollmentsForReview({ status: "submitted", page: 1 }).catch(() => ({
      rows: [],
      total: 0,
    })),
    getBillingOverview({ status: "proof_under_review", page: 1 }).catch(() => ({
      charges: [],
      summary: { underReviewCents: 0 },
    })),
  ]);

  const pendingEnrollments = pendingEnrollmentsData.rows;
  const pendingProofs = pendingBillingData.charges;
  const hasUrgentTasks = pendingEnrollments.length > 0 || pendingProofs.length > 0;

  if (!hasUrgentTasks) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 text-sm text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <span>Tudo em dia! Nenhuma matrícula ou comprovante pendente de conferência no momento.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <AlertCircle className="size-5 text-warning" aria-hidden="true" />
          <span>Aguardando sua conferência</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Matrículas Pendentes */}
        {pendingEnrollments.length > 0 ? (
          <Card variant="floating" className="border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="size-4 text-warning" aria-hidden="true" />
                  <span>Matrículas para análise ({pendingEnrollmentsCount})</span>
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href={ROUTES.adminEnrollments}>Ver todas</Link>
                </Button>
              </div>
              <CardDescription className="text-xs">
                Alunos que enviaram documentos e aguardam aprovação para treinar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {pendingEnrollments.slice(0, 3).map((item) => (
                <div
                  key={item.student.$id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-surface-recessed/60 p-2.5 text-sm depth-recessed"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StudentAvatar
                      name={item.student.full_name}
                      photoDocumentId={item.profilePhotoDocumentId}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-xs sm:text-sm">
                        {item.student.full_name}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {item.student.current_belt ? (
                          <BeltBadge belt={item.student.current_belt} gub={item.student.gub} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Iniciante</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0 h-8 text-xs font-medium">
                    <Link href={`${ROUTES.adminEnrollments}/${item.student.$id}`}>Analisar</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Comprovantes PIX Pendentes */}
        {pendingProofs.length > 0 ? (
          <Card variant="floating" className="border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck className="size-4 text-warning" aria-hidden="true" />
                  <span>Comprovantes PIX ({pendingProofs.length})</span>
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href={`${ROUTES.adminBilling}?status=proof_under_review`}>Ver todos</Link>
                </Button>
              </div>
              <CardDescription className="text-xs">
                Total de <strong>{money(pendingBillingData.summary.underReviewCents)}</strong> aguardando confirmação bancária.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {pendingProofs.slice(0, 3).map((charge) => (
                <div
                  key={charge.$id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-surface-recessed/60 p-2.5 text-sm depth-recessed"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium text-foreground text-xs sm:text-sm">
                      Mensalidade · {charge.competence || "Cobrança"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor: <strong className="text-foreground">{money(charge.amount_cents)}</strong>
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 h-8 text-xs font-medium">
                    <Link href={`${ROUTES.adminBilling}?status=proof_under_review`}>Conferir</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

// --- Componente Assíncrono 2: Treinos de Hoje ---
async function TodayClassesSection() {
  const todayWeekday = getTodayWeekday();
  const classes = await listTrainingClasses();
  const classesToday = classes.filter(
    (c) => c.status === "active" && c.weekdays.includes(todayWeekday)
  );

  return (
    <section className="space-y-3" aria-label="Treinos de hoje">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarCheck2 className="size-5 text-primary" aria-hidden="true" />
          <span>Treinos de hoje ({todayWeekday})</span>
        </h2>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={ROUTES.adminClasses}>Ver todas as turmas</Link>
        </Button>
      </div>

      {classesToday.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classesToday.map((classItem) => (
            <Card key={classItem.$id} className="relative overflow-hidden hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold truncate">
                    {classItem.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0 font-medium">
                    {classItem.weekdays.map((d) => d.slice(0, 3)).join("/")}
                  </Badge>
                </div>
                <CardDescription className="text-xs flex items-center gap-1.5 pt-1 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {classItem.start_time} às {classItem.end_time}
                  </span>
                  {classItem.location ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{classItem.location}</span>
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button asChild size="sm" className="w-full h-10 font-medium">
                  <Link href={`${ROUTES.adminClasses}/${classItem.$id}`}>
                    <CalendarCheck2 className="size-4 mr-1.5" aria-hidden="true" />
                    Iniciar chamada da turma
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-xs sm:text-sm text-muted-foreground">
          Hoje ({todayWeekday}) não há treinos agendados na grade regular da academia.
        </div>
      )}
    </section>
  );
}

// --- Componente Assíncrono 3: Métricas de Operação ---
async function AdminMetricsSection() {
  const [classes, billing] = await Promise.all([
    listTrainingClasses(),
    getBillingOverview({ page: 1 }),
  ]);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo operacional">
      <MetricCard
        label="Recebido no mês"
        value={money(billing.summary.receivedCents)}
        tone="success"
        helper={`${billing.summary.distinctPayingStudents} aluno${billing.summary.distinctPayingStudents === 1 ? "" : "s"} com mensalidade paga`}
        icon={<WalletCards aria-hidden="true" />}
      />
      <MetricCard
        label="Mensalidades em atraso"
        value={money(billing.summary.overdueCents)}
        tone={billing.summary.overdueCents > 0 ? "danger" : "neutral"}
        helper={billing.summary.overdueCents > 0 ? "Exige cobrança ou contato" : "Nenhum atraso"}
        icon={<AlertCircle aria-hidden="true" />}
      />
      <MetricCard
        label="Turmas ativas"
        value={classes.length}
        helper="Grade semanal da academia"
        icon={<CalendarDays aria-hidden="true" />}
      />
      <MetricCard
        label="Alunos adimplentes"
        value={billing.summary.distinctPayingStudents}
        tone="info"
        icon={<UsersRound aria-hidden="true" />}
      />
    </section>
  );
}

// --- Componente Assíncrono 4: Próximo Exame e Atalhos ---
async function ExamsAndShortcutsSection() {
  const exams = await listExamEvents();
  const upcomingExam = exams
    .filter(
      (exam) =>
        exam.status !== "cancelled" &&
        exam.status !== "completed" &&
        exam.event_date.slice(0, 10) >= new Date().toISOString().slice(0, 10)
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col justify-between hover:border-primary/30 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Próximo exame de faixa</CardTitle>
            <Award className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingExam ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">{upcomingExam.name}</span>
                <Badge variant="secondary">
                  {new Date(upcomingExam.event_date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Local: {upcomingExam.location || "Dojô principal"}
              </p>
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href={`${ROUTES.adminExams}/${upcomingExam.$id}`}>
                  Ver inscritos e detalhes
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Nenhum exame de graduação agendado para as próximas semanas.
              </p>
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href={ROUTES.adminExams}>Planejar novo exame</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between hover:border-primary/30 transition-colors">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Operação e Comunicação</CardTitle>
          <CardDescription className="text-xs">
            Acesse rapidamente os relatórios financeiros ou envie avisos e comunicados importantes aos alunos.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-10 font-medium">
              <Link href={ROUTES.adminBilling}>Visão financeira completa</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 font-medium">
              <Link href={ROUTES.notifications}>
                <Megaphone className="size-4 mr-1.5 text-primary" aria-hidden="true" />
                Enviar aviso aos alunos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminPage() {
  const profile = await requireProfile("admin");

  const adminChecklistItems = [
    { id: "1", label: "Conta de administrador mestre verificada", href: ROUTES.admin, completed: true },
    { id: "2", label: "Conferir turmas ativas na Ilha do Governador", href: ROUTES.adminClasses, completed: true },
    { id: "3", label: "Analisar fichas de matrículas de alunos", href: ROUTES.adminEnrollments, completed: false },
    { id: "4", label: "Acompanhar bancas de exames de faixa", href: ROUTES.adminExams, completed: false },
  ];

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.admin}
      title={`Olá, ${profile.full_name.split(" ")[0]}`}
      subtitle="Acompanhe as tarefas pendentes, treinos de hoje e o resumo operacional da academia."
      breadcrumbs={[{ label: "Início" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={null}>
          <OnboardingTrigger
            role="admin"
            userName={profile.full_name}
            hasCompletedOnboarding={Boolean(profile.onboarding_completed_at)}
          />
        </Suspense>

        {/* Trilha Inicial / Onboarding Checklist */}
        <OnboardingChecklist role="admin" items={adminChecklistItems} />

        {/* 1. Tarefas Urgentes */}
        <Suspense
          fallback={
            <div className="h-24 w-full rounded-xl border border-border/60 bg-card p-4 animate-pulse">
              <Skeleton className="h-5 w-44 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          }
        >
          <UrgentTasksSection />
        </Suspense>

        {/* 2. Treinos de Hoje */}
        <Suspense fallback={<CardGridSkeleton count={3} columns={3} />}>
          <TodayClassesSection />
        </Suspense>

        {/* 3. Indicadores Operacionais */}
        <Suspense fallback={<MetricCardsSkeleton count={4} />}>
          <AdminMetricsSection />
        </Suspense>

        {/* 4. Exames e Atalhos */}
        <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}>
          <ExamsAndShortcutsSection />
        </Suspense>
      </div>
    </PortalShell>
  );
}
