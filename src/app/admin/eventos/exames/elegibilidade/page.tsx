import Link from "next/link";
import { Suspense } from "react";
import { enrollEligibleStudentAction } from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { findRank } from "@/features/academy/belt-rules";
import { isRankKey } from "@/features/academy/ranks";
import { listTrainingClasses } from "@/features/classes/service";
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

function EligibilityCriterion({
  met,
  text,
}: {
  met: boolean;
  text: string;
}) {
  return (
    <span className={met ? "inline-flex items-center gap-1.5 text-sm font-medium text-foreground tabular-nums" : "text-sm text-muted-foreground tabular-nums"}>
      {met ? <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden="true" /> : null}
      {text}
    </span>
  );
}

function EligibilityActions({
  row,
  nextOpenEvent,
  ranks,
}: {
  row: Awaited<ReturnType<typeof getExamEligibilityOverview>>["rows"][number];
  nextOpenEvent: Awaited<ReturnType<typeof getExamEligibilityOverview>>["openEvents"][number] | null;
  ranks: Awaited<ReturnType<typeof getBeltRanks>>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
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
  );
}

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
  const chipHref = (next: ExamEligibilityStatus | undefined) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (classId) query.set("turma", classId);
    if (rankKey) query.set("rank", rankKey);
    if (next) query.set("status", next);
    return query.size ? `${ROUTES.adminExamEligibility}?${query}` : ROUTES.adminExamEligibility;
  };

  return (
    <div className="space-y-6">
      <FilterChips
        label="Aptidão"
        items={[
          { label: "Todos", href: chipHref(undefined), count: summary.totalActive, active: !status },
          { label: "Aptos", href: chipHref("eligible"), count: summary.eligibleCount, active: status === "eligible" },
          { label: "Quase prontos", href: chipHref("almost_ready"), count: summary.almostReadyCount, active: status === "almost_ready" },
          { label: "Pendência financeira", href: chipHref("financial_hold"), count: summary.financialHoldCount, active: status === "financial_hold", urgent: true },
          { label: "Inscritos", href: chipHref("already_registered"), count: summary.alreadyRegisteredCount, active: status === "already_registered" },
          { label: "Em carência", href: chipHref("in_progress"), count: summary.inProgressCount, active: status === "in_progress" },
        ]}
      />
      {status === "almost_ready" ? (
        <p className="text-sm text-muted-foreground">Quase prontos: já cumpriram {examPolicy.almost_ready_pct}% ou mais do tempo e das aulas.</p>
      ) : null}
      {nextOpenEvent ? (
        <p className="text-sm text-muted-foreground">Próxima banca aberta: <span className="font-medium text-foreground">{nextOpenEvent.name}</span></p>
      ) : null}

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

          <ResponsiveDataView
            desktop={
              <div className="overflow-hidden rounded-xl bg-card shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Aluno</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Requisitos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="t-stagger">
                    {rows.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell className="whitespace-normal">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar
                              name={row.fullName}
                              photoDocumentId={row.photoDocumentId}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {row.fullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.trainingClassName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.targetRankKey ? (
                            <BeltProgressionPill
                              fromRankKey={row.currentRankKey}
                              toRankKey={row.targetRankKey}
                              size="sm"
                            />
                          ) : (
                            <BeltBadge rankKey={row.currentRankKey} size="sm" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.minPresencesRequired > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <EligibilityCriterion
                                met={row.presenceProgressPct >= 100}
                                text={`${row.presencesSinceLastBelt}/${row.minPresencesRequired} aulas`}
                              />
                              <EligibilityCriterion
                                met={row.timeProgressPct >= 100}
                                text={`${Math.floor(row.monthsInCurrentBelt)}/${row.minMonthsRequired} meses`}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <StatusBadge tone={STATUS_TONES[row.status]}>
                              {STATUS_LABELS[row.status]}
                            </StatusBadge>
                            {row.ageBlocked && row.minAgeRequired != null ? (
                              <p className="text-xs text-muted-foreground">
                                Mín. {row.minAgeRequired} anos
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <EligibilityActions row={row} nextOpenEvent={nextOpenEvent} ranks={ranks} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            }
            mobile={
              <ul className="t-stagger space-y-3">
                {rows.map((row) => (
                  <li key={row.studentId} className="space-y-3 rounded-xl bg-card p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <StudentAvatar
                          name={row.fullName}
                          photoDocumentId={row.photoDocumentId}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {row.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.trainingClassName}
                          </p>
                        </div>
                      </div>
                      <StatusBadge tone={STATUS_TONES[row.status]}>
                        {STATUS_LABELS[row.status]}
                      </StatusBadge>
                    </div>

                    {row.targetRankKey ? (
                      <BeltProgressionPill
                        fromRankKey={row.currentRankKey}
                        toRankKey={row.targetRankKey}
                        size="sm"
                      />
                    ) : (
                      <BeltBadge rankKey={row.currentRankKey} size="sm" />
                    )}

                    {row.minPresencesRequired > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <EligibilityCriterion
                          met={row.presenceProgressPct >= 100}
                          text={`${row.presencesSinceLastBelt}/${row.minPresencesRequired} aulas`}
                        />
                        <EligibilityCriterion
                          met={row.timeProgressPct >= 100}
                          text={`${Math.floor(row.monthsInCurrentBelt)}/${row.minMonthsRequired} meses`}
                        />
                      </div>
                    ) : null}

                    {row.ageBlocked && row.minAgeRequired != null ? (
                      <p className="text-xs text-muted-foreground">
                        Idade mínima para esta graduação: {row.minAgeRequired} anos.
                      </p>
                    ) : null}

                    <div className="border-t border-border/40 pt-2">
                      <EligibilityActions row={row} nextOpenEvent={nextOpenEvent} ranks={ranks} />
                    </div>
                  </li>
                ))}
              </ul>
            }
          />
        </section>
      )}
    </div>
  );
}

async function EligibilityFiltersLoader() {
  const classes = await listTrainingClasses(true);
  return <EligibilityFilters classes={toClientData(classes)} />;
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
