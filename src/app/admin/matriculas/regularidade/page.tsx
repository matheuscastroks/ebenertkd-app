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
import { listTrainingClasses } from "@/features/classes/service";
import type { MedicalComplianceStatus } from "@/features/students/compliance-rules";
import { getAnnualComplianceOverview } from "@/features/students/compliance-service";
import { PARQ_STATUS_LABELS, type ParqStatus } from "@/features/students/parq-rules";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { ComplianceChart } from "@/features/students/components/compliance-chart";
import { ComplianceFilters } from "@/features/students/components/compliance-filters";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { formatBusinessDateBr } from "@/lib/dates";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, Bell } from "@/components/ui/icons";

const STATUS_LABELS: Record<MedicalComplianceStatus, string> = {
  valid: "Atestado em dia",
  expiring_soon: "Vence em ≤ 30 dias",
  expired: "Atestado vencido",
  pending_review: "Aguardando análise",
  missing: "Sem atestado aprovado",
};

const STATUS_TONES: Record<MedicalComplianceStatus, StatusTone> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
  pending_review: "info",
  missing: "danger",
};

const PARQ_TONES: Record<ParqStatus, StatusTone> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
  missing: "warning",
};

const allowedStatuses = new Set<MedicalComplianceStatus>([
  "valid",
  "expiring_soon",
  "expired",
  "pending_review",
  "missing",
]);

type SearchParams = Promise<{
  q?: string;
  status?: string;
  turma?: string;
  notified?: string;
  error?: string;
}>;

async function ComplianceContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = allowedStatuses.has(params.status as MedicalComplianceStatus)
    ? (params.status as MedicalComplianceStatus)
    : undefined;
  const classId = params.turma && params.turma !== "all" ? params.turma : undefined;

  const data = await getAnnualComplianceOverview({
    status,
    classId,
    search: params.q,
  });

  const { summary, rows, policy } = data;
  const medicalWindow = policy.medical_expiring_window_days;
  const parqWindow = policy.parq_expiring_window_days;

  return (
    <div className="space-y-6">
      <dl
        aria-label="Resumo anual de regularidade"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <Link
          href={`${ROUTES.adminCompliance}?status=valid`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Em dia
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {summary.validCount}
          </dd>
          <p className="text-xs text-muted-foreground">
            {summary.complianceRatePct}% da base regular ou a renovar
          </p>
        </Link>

        <Link
          href={`${ROUTES.adminCompliance}?status=expiring_soon`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            Vencem em {medicalWindow} dias
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.expiringSoonCount}
          </dd>
          <p className="text-xs text-muted-foreground">janela preventiva de renovação</p>
        </Link>

        <Link
          href={`${ROUTES.adminCompliance}?status=expired`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
            Vencidos (&gt; 12m)
          </dt>
          <dd
            className={
              summary.expiredCount > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {summary.expiredCount}
          </dd>
          <p className="text-xs text-muted-foreground">necessitam novo atestado médico</p>
        </Link>

        <Link
          href={`${ROUTES.adminCompliance}?status=missing`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden="true" />
            Pendentes / Análise
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.missingCount + summary.pendingReviewCount}
          </dd>
          <p className="text-xs text-muted-foreground">
            {summary.pendingReviewCount} aguardando validação sua
          </p>
        </Link>
      </dl>

      <ComplianceChart summary={summary} />

      <section
        aria-label="Resumo anual do PAR-Q"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">PAR-Q em dia</p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {summary.parqValidCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.parqComplianceRatePct}% da base com PAR-Q vigente
          </p>
        </div>
        <div className="p-4 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">PAR-Q vence em {parqWindow}d</p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.parqExpiringSoonCount}
          </p>
          <p className="text-xs text-muted-foreground">próximos da renovação anual</p>
        </div>
        <div className="p-4 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">PAR-Q vencido / pendente</p>
          <p
            className={
              summary.parqExpiredCount + summary.parqMissingCount > 0
                ? "mt-1 text-xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {summary.parqExpiredCount + summary.parqMissingCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.parqExpiredCount} vencidos · {summary.parqMissingCount} sem envio
          </p>
        </div>
        <div className="p-4 sm:px-5">
          <p className="text-xs font-medium text-muted-foreground">PAR-Q com &quot;Sim&quot;</p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-warning-foreground">
            {summary.parqYesCount}
          </p>
          <p className="text-xs text-muted-foreground">recomendam conferência de atestado</p>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado para este filtro"
          description="Ajuste a turma ou situação do atestado para consultar outros alunos."
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminCompliance}>Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="compliance-list-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="compliance-list-heading" className="text-base font-semibold">
              Situação documental ({rows.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Ordenado por urgência de renovação (vencidos e pendentes primeiro).
            </p>
          </div>

          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {rows.map((row) => (
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
                      <StatusBadge tone={STATUS_TONES[row.medicalStatus]}>
                        {row.medicalStatus === "expiring_soon" ? `Vence em ≤ ${medicalWindow} dias` : STATUS_LABELS[row.medicalStatus]}
                      </StatusBadge>
                      <StatusBadge tone={PARQ_TONES[row.parqStatus]}>
                        {PARQ_STATUS_LABELS[row.parqStatus]}
                      </StatusBadge>
                      {row.parqHasYesAnswer ? (
                        <StatusBadge tone="warning">PAR-Q com &quot;Sim&quot;</StatusBadge>
                      ) : null}
                      <BeltBadge rankKey={row.rankKey} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.trainingClassName}
                      {row.medicalExpiresAt
                        ? ` · Atestado até ${formatBusinessDateBr(row.medicalExpiresAt)}`
                        : row.medicalIssuedAt
                          ? ` · Atestado enviado em ${formatBusinessDateBr(row.medicalIssuedAt)}`
                          : " · Sem atestado registrado"}
                      {row.parqExpiresAt
                        ? ` · PAR-Q até ${formatBusinessDateBr(row.parqExpiresAt)}`
                        : " · PAR-Q não preenchido"}
                      {!row.hasEmergencyContact ? " · Contato de emergência ausente" : ""}
                      {!row.hasApprovedPhoto ? " · Foto pendente" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  {row.parqStatus === "expired" ||
                  row.parqStatus === "expiring_soon" ||
                  row.parqStatus === "missing" ? (
                    <form action={sendTargetedNotificationAction}>
                      <input type="hidden" name="profile_id" value={row.profileId} />
                      <input type="hidden" name="return_to" value={ROUTES.adminCompliance} />
                      <input type="hidden" name="action_url" value={ROUTES.studentParq} />
                      <input
                        type="hidden"
                        name="title"
                        value="Atualização anual do questionário PAR-Q"
                      />
                      <input
                        type="hidden"
                        name="body"
                        value={
                          row.parqStatus === "expiring_soon" && row.parqExpiresAt
                            ? `Olá! O questionário anual PAR-Q vence em ${formatBusinessDateBr(row.parqExpiresAt)}. Acesse a área PAR-Q anual no portal para renovar.`
                            : "Olá! Precisamos do preenchimento e assinatura anual do questionário de prontidão física (PAR-Q) no portal para manter sua matrícula regular."
                        }
                      />
                      <FormSubmitButton
                        size="sm"
                        variant="outline"
                        className="min-h-10"
                        pendingLabel="Solicitando…"
                      >
                        <Bell className="size-3.5" aria-hidden="true" />
                        Solicitar PAR-Q
                      </FormSubmitButton>
                    </form>
                  ) : null}
                  {row.medicalStatus === "expired" ||
                  row.medicalStatus === "expiring_soon" ||
                  row.medicalStatus === "missing" ? (
                    <form action={sendTargetedNotificationAction}>
                      <input type="hidden" name="profile_id" value={row.profileId} />
                      <input type="hidden" name="return_to" value={ROUTES.adminCompliance} />
                      <input type="hidden" name="action_url" value={ROUTES.studentEnrollment} />
                      <input
                        type="hidden"
                        name="title"
                        value="Atualização anual de atestado médico"
                      />
                      <input
                        type="hidden"
                        name="body"
                        value={
                          row.medicalStatus === "expiring_soon"
                            ? `Olá! Seu atestado médico vence em ${formatBusinessDateBr(row.medicalExpiresAt)}. Envie a renovação pela área de matrícula.`
                            : "Olá! Precisamos do envio ou renovação anual do seu atestado médico na área de matrícula para manter sua ficha em dia."
                        }
                      />
                      <FormSubmitButton
                        size="sm"
                        variant="outline"
                        className="min-h-10"
                        pendingLabel="Solicitando…"
                      >
                        <Bell className="size-3.5" aria-hidden="true" />
                        Solicitar atestado
                      </FormSubmitButton>
                    </form>
                  ) : null}

                  <Button asChild size="sm" variant="outline" className="min-h-10">
                    <Link href={adminEnrollmentPath(row.studentId)}>
                      {row.medicalStatus === "pending_review" ? "Analisar documento" : "Abrir ficha"}
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

async function ComplianceFiltersLoader() {
  const classes = await listTrainingClasses(true);
  return <ComplianceFilters classes={toClientData(classes)} />;
}

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminCompliance}
      title="Regularidade anual"
      subtitle="Controle a validade anual de atestados médicos, questionários PAR-Q (CREF1) e pendências de ficha dos alunos ativos."
      breadcrumbs={[
        { label: "Matrículas", href: ROUTES.adminEnrollments },
        { label: "Regularidade anual" },
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
            title="Solicitação enviada"
            description="O aluno e o responsável receberam o pedido de atestado no portal."
            clearParams={["notified"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar a solicitação"
            description="Tente novamente em alguns instantes."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <ComplianceFiltersLoader />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={4} rows={5} />
            </div>
          }
        >
          <ComplianceContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
