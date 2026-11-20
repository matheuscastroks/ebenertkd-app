import Link from "next/link";
import { Suspense } from "react";
import { enrollEligibleStudentAction } from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { findRank } from "@/features/academy/belt-rules";
import { isRankKey } from "@/features/academy/ranks";
import { listTrainingClasses } from "@/features/classes/service";
import { EligibilityChart } from "@/features/exams/components/eligibility-chart";
import { EligibilityFilters } from "@/features/exams/components/eligibility-filters";
import type { ExamEligibilityStatus } from "@/features/exams/eligibility-rules";
import { getExamEligibilityOverview } from "@/features/exams/eligibility-service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { formatBrl } from "@/lib/money";
import { adminEnrollmentPath, adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, CheckCircle2 } from "@/components/ui/icons";

const STATUS_LABELS: Record<ExamEligibilityStatus, string> = {
  eligible: "Apto para exame",
  almost_ready: "Quase pronto",
  financial_hold: "Pendência financeira",
  already_registered: "Inscrito na banca",
  in_progress: "Em carência",
  black_belt: "Faixa preta",
};

const STATUS_TONES: Record<ExamEligibilityStatus, StatusTone> = {
  eligible: "success",
  almost_ready: "info",
  financial_hold: "danger",
  already_registered: "neutral",
  in_progress: "warning",
  black_belt: "neutral",
};

const allowedStatuses = new Set<ExamEligibilityStatus>([
  "eligible",
  "almost_ready",
  "financial_hold",
  "already_registered",
  "in_progress",
  "black_belt",
]);

type SearchParams = Promise<{
  q?: string;
  status?: string;
  turma?: string;
  rank?: string;
  enrolled?: string;
  error?: string;
}>;

async function EligibilityContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = allowedStatuses.has(params.status as ExamEligibilityStatus)
    ? (params.status as ExamEligibilityStatus)
    : undefined;
  const classId = params.turma && params.turma !== "all" ? params.turma : undefined;
  const rankKey = isRankKey(params.rank) ? params.rank : undefined;

  const [data, ranks, examPolicy] = await Promise.all([
    getExamEligibilityOverview({ status, classId, rankKey, search: params.q }),
    getBeltRanks(),
    getPolicy("exam"),
  ]);

  const { summary, rows, openEvents } = data;
  const nextOpenEvent = openEvents[0] ?? null;

  return (
    <div className="space-y-6">
      <dl
        aria-label="Resumo de elegibilidade para exames"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <Link
          href={`${ROUTES.adminExamEligibility}?status=eligible`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Aptos agora
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {summary.eligibleCount}
          </dd>
          <p className="text-xs text-muted-foreground">cumprem carência, aulas e financeiro</p>
        </Link>

        <Link
          href={`${ROUTES.adminExamEligibility}?status=almost_ready`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden="true" />
            Quase prontos
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.almostReadyCount}
          </dd>
          <p className="text-xs text-muted-foreground">atingiram {examPolicy.almost_ready_pct}% ou mais da meta</p>
        </Link>

        <Link
          href={`${ROUTES.adminExamEligibility}?status=financial_hold`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
            Pendência financeira
          </dt>
          <dd
            className={
              summary.financialHoldCount > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {summary.financialHoldCount}
          </dd>
          <p className="text-xs text-muted-foreground">aptos na técnica, mas com atraso</p>
        </Link>

        <Link
          href={`${ROUTES.adminExamEligibility}?status=already_registered`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
            Inscritos na banca
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.alreadyRegisteredCount}
          </dd>
          <p className="text-xs text-muted-foreground">
            {nextOpenEvent ? `Próxima: ${nextOpenEvent.name}` : "Nenhuma banca aberta"}
          </p>
        </Link>
      </dl>

      <EligibilityChart summary={summary} />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado para este filtro"
          description="Ajuste a faixa, turma ou status para consultar os alunos em evolução."
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminExamEligibility}>Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="eligibility-list-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="eligibility-list-heading" className="text-base font-semibold">
              Avaliação por aluno ({rows.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Critérios da academia: carência mínima na graduação atual e presença acumulada (configurados em Graduações).
            </p>
          </div>

          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {rows.map((row) => (
              <li
                key={row.studentId}
                className="t-interactive-row flex flex-col gap-4 px-4 py-4 hover:bg-muted/50 xl:flex-row xl:items-center xl:justify-between sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <StudentAvatar
                    name={row.fullName}
                    photoDocumentId={row.photoDocumentId}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.fullName}
                      </p>
                      <StatusBadge tone={STATUS_TONES[row.status]}>
                        {STATUS_LABELS[row.status]}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">{row.trainingClassName}</span>
                    </div>

                    {row.targetRankKey ? (
                      <BeltProgressionPill fromRankKey={row.currentRankKey} toRankKey={row.targetRankKey} size="sm" />
                    ) : (
                      <BeltBadge rankKey={row.currentRankKey} size="sm" />
                    )}
                    {row.ageBlocked && row.minAgeRequired != null ? (
                      <p className="text-xs text-muted-foreground">Idade mínima para esta graduação: {row.minAgeRequired} anos.</p>
                    ) : null}

                    {row.minPresencesRequired > 0 ? (
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Presenças na faixa</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {row.presencesSinceLastBelt}/{row.minPresencesRequired} aulas
                            </span>
                          </div>
                          <Progress value={row.presenceProgressPct} className="h-2" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Carência de tempo</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {Math.floor(row.monthsInCurrentBelt)}/{row.minMonthsRequired} meses
                            </span>
                          </div>
                          <Progress value={row.timeProgressPct} className="h-2" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
                  {row.status === "eligible" && nextOpenEvent && row.targetRankKey ? (
                    <form action={enrollEligibleStudentAction}>
                      <input type="hidden" name="event_id" value={nextOpenEvent.$id} />
                      <input type="hidden" name="student_id" value={row.studentId} />
                      <input type="hidden" name="target_rank_key" value={row.targetRankKey} />
                      <FormSubmitButton
                        size="sm"
                        className="min-h-10"
                        pendingLabel="Inscrevendo…"
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Inscrever ({formatBrl(findRank(ranks, row.targetRankKey)?.exam_fee_cents ?? nextOpenEvent.default_fee_cents)})
                      </FormSubmitButton>
                    </form>
                  ) : null}

                  {row.status === "already_registered" && row.registeredEventId ? (
                    <Button asChild size="sm" variant="outline" className="min-h-10">
                      <Link href={adminExamPath(row.registeredEventId)}>
                        Ver banca
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}

                  {row.status === "financial_hold" ? (
                    <Button asChild size="sm" variant="outline" className="min-h-10">
                      <Link
                        href={`${ROUTES.adminBilling}?student=${encodeURIComponent(row.fullName)}&status=overdue`}
                      >
                        Ver atrasos
                      </Link>
                    </Button>
                  ) : null}

                  <Button asChild size="sm" variant="ghost" className="min-h-10">
                    <Link href={adminEnrollmentPath(row.studentId)}>
                      Ficha
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function EligibilityFiltersLoader() {
  const [classes, examPolicy] = await Promise.all([listTrainingClasses(true), getPolicy("exam")]);
  return <EligibilityFilters classes={toClientData(classes)} almostReadyPct={examPolicy.almost_ready_pct} />;
}

export default async function AdminExamEligibilityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      title="Eventos"
      subtitle="Quem já pode fazer exame: tempo na faixa, presenças e pagamentos em dia."
    >
      <div className="w-full min-w-0 space-y-6">
        {params.enrolled ? (
          <OperationToast
            tone="success"
            title="Aluno inscrito na banca"
            description="A participação e a taxa de exame foram geradas automaticamente."
            clearParams={["enrolled"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível inscrever o aluno"
            description="Verifique se há um exame em aberto e se a matrícula está ativa."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <EligibilityFiltersLoader />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={4} rows={5} />
            </div>
          }
        >
          <EligibilityContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
