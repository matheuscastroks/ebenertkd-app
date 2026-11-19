import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardGridSkeleton, MetricCardsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Profile } from "@/features/auth/types";
import { getPolicy } from "@/features/academy/config-service";
import { buildStudentConsistencyReport } from "@/features/students/achievements-rules";
import { EarnedBadges } from "@/features/students/components/earned-badges";
import { ConsistencyHeatmap } from "@/features/students/components/consistency-heatmap";
import { StudentMonthlyProgressChart } from "@/features/students/components/journey-charts";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";
import { Award, CheckCircle2, Flame } from "@/components/ui/icons";

async function StudentAchievementsContent({ profile }: { profile: Profile }) {
  const [snapshot, gamification] = await Promise.all([getStudentJourneySnapshot(profile), getPolicy("gamification")]);

  if (!snapshot.student) {
    return (
      <EmptyState
        title="Sua jornada começa no primeiro treino"
        description="Complete sua matrícula para acompanhar suas sequências, medalhas e mapa de constância."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Ir para minha matrícula</Link>
          </Button>
        }
      />
    );
  }

  const report = buildStudentConsistencyReport({
    badges: gamification.badges,
    entries: snapshot.attendanceEntries,
    beltHistory: snapshot.beltHistory,
    earnedBadges: snapshot.earnedBadges,
    startedAt:
      snapshot.student.started_at_tkd ??
      snapshot.enrollment?.contract_start ??
      snapshot.student.created_at,
  });

  return (
    <div className="space-y-6">
      <dl
        aria-label="Indicadores de constância"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Flame className="size-4 text-primary-text" aria-hidden="true" />
            Sequência atual
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {report.currentWeekStreak} {report.currentWeekStreak === 1 ? "semana" : "semanas"}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            Recorde pessoal: {report.bestWeekStreak} semanas
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Treinos concluídos</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {report.totalPresences}
          </dd>
          <p className="text-xs text-muted-foreground">presenças confirmadas no tatame</p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Meses exemplares</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {report.perfectMonthsCount}
          </dd>
          <p className="text-xs text-muted-foreground">meses completos sem faltas</p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Award className="size-4 text-primary-text" aria-hidden="true" />
            Conquistas
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {report.unlockedCount}/{report.badges.length}
          </dd>
          <p className="text-xs text-muted-foreground">marcos desbloqueados</p>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-base font-semibold">Constância no dojang</h2>
          <ConsistencyHeatmap weeks={report.heatmapWeeks} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-2 text-base font-semibold">Presenças por mês</h2>
          <StudentMonthlyProgressChart series={snapshot.monthlySeries} />
        </section>
      </div>

      <EarnedBadges badges={toClientData(snapshot.earnedBadges)} />

      <section aria-labelledby="badges-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="badges-heading" className="text-base font-semibold">
            Marcos e conquistas
          </h2>
          <p className="text-xs text-muted-foreground">
            Faltas justificadas por saúde ou imprevistos não quebram sua sequência.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {report.badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{badge.title}</h3>
                  {badge.unlocked ? (
                    <StatusBadge tone="success">
                      <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                      Obtida
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">{badge.progressPct}%</StatusBadge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>

              <div className="space-y-1">
                <Progress value={badge.progressPct} className="h-2" />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {Math.min(badge.currentValue, badge.targetValue)}/{badge.targetValue}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function StudentAchievementsPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentAchievements}
      title="Conquistas e constância"
      subtitle="Acompanhe sua sequência semanal de treinos, o mapa de presenças e seus marcos no Taekwondo."
      breadcrumbs={[{ label: "Conquistas" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <CardGridSkeleton count={4} columns={2} />
            </div>
          }
        >
          <StudentAchievementsContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
