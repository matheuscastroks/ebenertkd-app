import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardGridSkeleton, MetricCardsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getBeltContext } from "@/features/academy/config-service";
import type { Profile } from "@/features/auth/types";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, BookOpen, CheckCircle2 } from "@/components/ui/icons";

async function StudentEvolutionContent({ profile }: { profile: Profile }) {
  const [snapshot, { formLabel }] = await Promise.all([getStudentJourneySnapshot(profile), getBeltContext()]);

  if (!snapshot.student) {
    return (
      <EmptyState
        illustration="empty-journey"
        title="Preencha sua ficha para acompanhar a faixa"
        description="Depois que o professor aprovar a ficha, o progresso para o próximo exame aparece aqui."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Preencher ficha</Link>
          </Button>
        }
      />
    );
  }

  const { readiness, roadmap, beltHistory } = snapshot;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="readiness-heading"
        className="overflow-hidden rounded-xl bg-card shadow-xs divide-y divide-border"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p id="readiness-heading" className="text-sm font-medium text-muted-foreground">
              Próxima faixa
            </p>
            {readiness.targetRankKey ? (
              <BeltProgressionPill
                fromRankKey={readiness.currentRankKey}
                toRankKey={readiness.targetRankKey}
                size="lg"
              />
            ) : (
              <BeltBadge rankKey={readiness.currentRankKey} size="lg" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={readiness.isPedagogicallyReady ? "success" : "info"}>
              {readiness.isBlackBelt
                ? "Faixa preta"
                : readiness.isPedagogicallyReady
                  ? "Critérios mínimos atingidos"
                  : `${readiness.overallProgressPct}% da meta técnica`}
            </StatusBadge>
            <Button asChild variant="outline" size="sm" className="min-h-10">
              <Link href={ROUTES.studentStudies}>
                <BookOpen className="size-4" aria-hidden="true" />
                Estudar {readiness.currentForm ?? formLabel}
              </Link>
            </Button>
          </div>
        </div>

        {!readiness.isBlackBelt ? (
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">Treinos na faixa atual</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {readiness.presencesSinceLastBelt} de {readiness.minPresencesRequired} aulas
                </span>
              </div>
              <Progress value={readiness.presenceProgressPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {readiness.remainingPresences === 0
                  ? "Presenças mínimas cumpridas."
                  : `Faltam ${readiness.remainingPresences} presença${readiness.remainingPresences === 1 ? "" : "s"} para o exame.`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">Tempo na faixa atual</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {Math.floor(readiness.monthsInCurrentBelt)} de {readiness.minMonthsRequired} meses
                </span>
              </div>
              <Progress value={readiness.timeProgressPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {readiness.remainingDays === 0
                  ? "Tempo mínimo cumprido."
                  : `Faltam cerca de ${readiness.remainingDays} dia${readiness.remainingDays === 1 ? "" : "s"} na faixa atual.`}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 bg-muted/30 p-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{formLabel} atual</p>
            <p className="mt-0.5 font-semibold text-foreground">{readiness.currentForm ?? "Não definido"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Próximo {formLabel}</p>
            <p className="mt-0.5 font-semibold text-foreground">
              {readiness.nextForm ?? "Aperfeiçoamento"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Na faixa atual desde</p>
            <p className="mt-0.5 font-semibold tabular-nums text-foreground">
              {formatBusinessDateBr(readiness.beltStartDate)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="roadmap-heading"
          className="space-y-3 rounded-xl bg-card p-5 shadow-xs"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="roadmap-heading" className="text-base font-semibold">
              Todas as faixas
            </h2>
            <span className="text-xs text-muted-foreground">Da primeira graduação à mais alta da academia</span>
          </div>

          <ol className="t-stagger divide-y divide-border">
            {roadmap.map((step) => (
              <li
                key={step.rankKey}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BeltBadge rankKey={step.rankKey} nameOverride={step.achievedName} size="sm" />
                  {step.formName ? <span className="truncate text-xs text-muted-foreground">{step.formName}</span> : null}
                </div>

                <div className="flex items-center gap-2">
                  {step.achievedAt ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatBusinessDateBr(step.achievedAt)}
                    </span>
                  ) : null}
                  {step.state === "achieved" ? (
                    <StatusBadge tone="success">
                      <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                      Conquistada
                    </StatusBadge>
                  ) : step.state === "current" ? (
                    <StatusBadge tone="info">Faixa atual</StatusBadge>
                  ) : step.state === "next" ? (
                    <StatusBadge tone="warning">Próximo objetivo</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Futura</StatusBadge>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section
            aria-labelledby="belt-history-heading"
            className="space-y-3 rounded-xl bg-card p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="belt-history-heading" className="text-base font-semibold">
                Histórico de graduações
              </h2>
              <Button asChild variant="ghost" size="sm" className="min-h-9">
                <Link href={ROUTES.studentExams}>
                  Ver exames
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {beltHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Suas promoções de faixa aprovadas em exame ficarão registradas aqui.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {beltHistory.map((item) => (
                  <li
                    key={item.$id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <BeltProgressionPill
                      fromRankKey={item.previous_rank_key}
                      toRankKey={item.new_rank_key}
                      fromName={item.previous_belt_name}
                      toName={item.new_belt_name}
                      size="sm"
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatBusinessDateBr(item.achieved_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default async function StudentEvolutionPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      title="Faixa"
      subtitle="Quanto falta para a próxima faixa."
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={2} />
              <CardGridSkeleton count={2} columns={2} />
            </div>
          }
        >
          <StudentEvolutionContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
