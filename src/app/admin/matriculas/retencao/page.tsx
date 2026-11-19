import Link from "next/link";
import { Suspense } from "react";
import { sendTargetedNotificationAction } from "@/app/actions/notifications";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { RetentionCharts } from "@/features/classes/components/retention-chart";
import { RetentionFilters } from "@/features/classes/components/retention-filters";
import type { RetentionRiskLevel } from "@/features/classes/retention-rules";
import { getRetentionOverview } from "@/features/classes/retention-service";
import { listTrainingClasses } from "@/features/classes/service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { formatBusinessDateBr, whatsappLink } from "@/lib/dates";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, Bell, MessageCircle } from "@/components/ui/icons";

const RISK_LABELS: Record<RetentionRiskLevel, string> = {
  critical: "Risco crítico",
  warning: "Em atenção",
  healthy: "Regular",
};

const RISK_TONES: Record<RetentionRiskLevel, StatusTone> = {
  critical: "danger",
  warning: "warning",
  healthy: "success",
};

type SearchParams = Promise<{
  q?: string;
  risk?: string;
  turma?: string;
  notified?: string;
  error?: string;
}>;

const allowedRisks = new Set<RetentionRiskLevel>(["critical", "warning", "healthy"]);

async function RetentionContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const risk = allowedRisks.has(params.risk as RetentionRiskLevel)
    ? (params.risk as RetentionRiskLevel)
    : undefined;
  const classId = params.turma && params.turma !== "all" ? params.turma : undefined;

  const data = await getRetentionOverview({
    risk,
    classId,
    search: params.q,
  });

  const { summary, rows } = data;
  const netSign = summary.netGrowthInMonth > 0 ? "+" : "";

  return (
    <div className="space-y-6">
      <dl
        aria-label="Resumo mensal de retenção"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Alunos ativos</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.totalActive}
          </dd>
          <p className="text-xs text-muted-foreground">
            {summary.retentionRatePct}% em frequência regular ou atenção
          </p>
        </div>

        <Link
          href={`${ROUTES.adminRetention}?risk=critical`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
            Risco crítico
          </dt>
          <dd
            className={
              summary.criticalCount > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {summary.criticalCount}
          </dd>
          <p className="text-xs text-muted-foreground">3+ faltas seguidas ou 21+ dias ausente</p>
        </Link>

        <Link
          href={`${ROUTES.adminRetention}?risk=warning`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            Em atenção
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.warningCount}
          </dd>
          <p className="text-xs text-muted-foreground">2 faltas seguidas ou 14–20 dias ausente</p>
        </Link>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Saldo líquido no mês</dt>
          <dd
            className={
              summary.netGrowthInMonth >= 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
            }
          >
            {netSign}
            {summary.netGrowthInMonth}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {summary.newEnrollmentsInMonth} entradas · {summary.cancellationsInMonth} saídas
          </p>
        </div>
      </dl>

      <RetentionCharts summary={summary} />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado neste recorte"
          description="Ajuste os filtros acima para visualizar outros níveis de frequência ou turmas."
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminRetention}>Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="retention-list-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="retention-list-heading" className="text-base font-semibold">
              Monitoramento por aluno ({rows.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Ordenado por prioridade de contato (críticos primeiro).
            </p>
          </div>

          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {rows.map((row) => {
              const waHref = whatsappLink(row.whatsapp);
              return (
                <li
                  key={row.studentId}
                  className="t-interactive-row flex flex-col gap-3 px-4 py-3.5 hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <StudentAvatar
                      name={row.fullName}
                      photoDocumentId={row.photoDocumentId}
                      size="sm"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.fullName}
                        </p>
                        <StatusBadge tone={RISK_TONES[row.riskLevel]}>
                          {RISK_LABELS[row.riskLevel]}
                        </StatusBadge>
                        <BeltBadge rankKey={row.rankKey} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.trainingClassName}
                        {" · "}
                        {row.riskReason}
                        {" · "}
                        Última presença:{" "}
                        <span className="tabular-nums">
                          {formatBusinessDateBr(row.lastPresentDate)}
                        </span>
                        {row.total30d > 0
                          ? ` · ${row.attended30d}/${row.total30d} aulas (30d)`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                    {row.riskLevel !== "healthy" ? (
                      <form action={sendTargetedNotificationAction}>
                        <input type="hidden" name="profile_id" value={row.profileId} />
                        <input type="hidden" name="return_to" value={ROUTES.adminRetention} />
                        <input type="hidden" name="action_url" value={ROUTES.studentAttendance} />
                        <input
                          type="hidden"
                          name="title"
                          value="Sentimos sua falta no dojang!"
                        />
                        <input
                          type="hidden"
                          name="body"
                          value={`Olá! Notamos sua ausência nos últimos treinos (${row.riskReason}). Esperamos você na próxima aula da turma ${row.trainingClassName}.`}
                        />
                        <FormSubmitButton
                          size="sm"
                          variant="outline"
                          className="min-h-10"
                          pendingLabel="Enviando…"
                        >
                          <Bell className="size-3.5" aria-hidden="true" />
                          Incentivar no app
                        </FormSubmitButton>
                      </form>
                    ) : null}

                    {waHref ? (
                      <Button asChild size="sm" variant="outline" className="min-h-10">
                        <a href={waHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-3.5" aria-hidden="true" />
                          WhatsApp
                        </a>
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
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

async function RetentionFiltersLoader() {
  const classes = await listTrainingClasses(true);
  return <RetentionFilters classes={toClientData(classes)} />;
}

export default async function AdminRetentionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminRetention}
      title="Retenção e frequência"
      subtitle="Acompanhe faltas consecutivas, alunos com risco de evasão e o saldo mensal da academia."
      breadcrumbs={[
        { label: "Matrículas", href: ROUTES.adminEnrollments },
        { label: "Retenção e frequência" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminEnrollments}>Ver matrículas</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {params.notified ? (
          <OperationToast
            tone="success"
            title="Lembrete enviado"
            description="O aluno e o responsável (quando aplicável) receberam o aviso no portal."
            clearParams={["notified"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar o lembrete"
            description="Verifique se o usuário possui perfil ativo e tente novamente."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <RetentionFiltersLoader />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={4} rows={5} />
            </div>
          }
        >
          <RetentionContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
