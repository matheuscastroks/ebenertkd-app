import Link from "next/link";
import { sendTargetedNotificationAction } from "@/app/actions/notifications";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bell } from "@/components/ui/icons";
import {
  COMPLIANCE_BUCKETS,
  type ComplianceBucket,
  type MedicalComplianceStatus,
  type StudentComplianceAssessment,
} from "@/features/students/compliance-rules";
import { getAnnualComplianceOverview } from "@/features/students/compliance-service";
import type { ParqStatus } from "@/features/students/parq-rules";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { formatBusinessDateBr } from "@/lib/dates";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

export type ComplianceQuery = { q?: string; status?: string; turma?: string };

const MEDICAL_BADGES: Partial<Record<MedicalComplianceStatus, { label: string; tone: StatusTone }>> = {
  expired: { label: "Atestado vencido", tone: "danger" },
  missing: { label: "Sem atestado", tone: "danger" },
  pending_review: { label: "Atestado para conferir", tone: "info" },
  expiring_soon: { label: "Atestado vence em breve", tone: "warning" },
};

const PARQ_BADGES: Partial<Record<ParqStatus, { label: string; tone: StatusTone }>> = {
  expired: { label: "PAR-Q vencido", tone: "danger" },
  missing: { label: "PAR-Q por preencher", tone: "warning" },
  expiring_soon: { label: "PAR-Q vence em breve", tone: "warning" },
};

const REQUESTABLE = new Set<string>(["expired", "expiring_soon", "missing"]);

export function parseComplianceBucket(value?: string): ComplianceBucket | undefined {
  return COMPLIANCE_BUCKETS.includes(value as ComplianceBucket) ? (value as ComplianceBucket) : undefined;
}

function compliancePath(query: ComplianceQuery, status?: ComplianceBucket) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.turma && query.turma !== "all") params.set("turma", query.turma);
  if (status) params.set("status", status);
  return `${ROUTES.adminCompliance}${params.size ? `?${params}` : ""}`;
}

/**
 * Documentos anuais: uma linha de chips filtra a lista única de alunos,
 * e cada aluno tem no máximo um pedido (atestado, PAR-Q ou os dois).
 */
export async function ComplianceContent({ query }: { query: ComplianceQuery }) {
  const status = parseComplianceBucket(query.status);
  const classId = query.turma && query.turma !== "all" ? query.turma : undefined;
  const { rows, bucketCounts, policy } = await getAnnualComplianceOverview({ status, classId, search: query.q });

  const sameWindow = policy.medical_expiring_window_days === policy.parq_expiring_window_days;
  const expiringLabel = sameWindow ? `Vencem em ${policy.medical_expiring_window_days} dias` : "Vencem em breve";
  const labels: Record<ComplianceBucket, string> = {
    expired: "Vencidos",
    expiring_soon: expiringLabel,
    pending: "Pendentes",
    valid: "Em dia",
  };
  const returnTo = compliancePath(query, status);

  return (
    <div className="space-y-4">
      <FilterChips
        label="Situação dos documentos"
        items={[
          { label: "Todos", href: compliancePath(query), active: !status },
          ...COMPLIANCE_BUCKETS.map((bucket) => ({
            label: labels[bucket],
            href: compliancePath(query, bucket),
            count: bucketCounts[bucket],
            active: status === bucket,
            urgent: bucket === "expired",
          })),
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={status ? `Nenhum aluno em "${labels[status]}"` : "Nenhum aluno encontrado"}
          description={status === "expired" ? "Ninguém está com atestado ou PAR-Q vencido." : "Mude a busca ou a turma para ver outros alunos."}
          action={
            status || query.q || classId ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={ROUTES.adminCompliance}>Ver todos</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section aria-labelledby="compliance-list-heading" className="space-y-3">
          <h2 id="compliance-list-heading" className="text-base font-semibold">
            {status ? labels[status] : "Todos os alunos"} ({rows.length})
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
            {rows.map((row) => (
              <ComplianceRow key={row.studentId} row={row} returnTo={returnTo} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ComplianceRow({ row, returnTo }: { row: StudentComplianceAssessment; returnTo: string }) {
  const badges = [MEDICAL_BADGES[row.medicalStatus], PARQ_BADGES[row.parqStatus]].filter(
    (badge): badge is { label: string; tone: StatusTone } => Boolean(badge)
  );
  const needsMedical = REQUESTABLE.has(row.medicalStatus);
  const needsParq = REQUESTABLE.has(row.parqStatus);
  const details = [
    row.trainingClassName,
    row.medicalExpiresAt ? `Atestado até ${formatBusinessDateBr(row.medicalExpiresAt)}` : null,
    row.parqExpiresAt ? `PAR-Q até ${formatBusinessDateBr(row.parqExpiresAt)}` : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <StudentAvatar name={row.fullName} photoDocumentId={row.photoDocumentId} size="sm" />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{row.fullName}</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.length === 0 ? <StatusBadge tone="success">Documentos em dia</StatusBadge> : null}
            {badges.map((badge) => (
              <StatusBadge key={badge.label} tone={badge.tone}>{badge.label}</StatusBadge>
            ))}
            {row.parqHasYesAnswer ? <StatusBadge tone="warning">PAR-Q com &quot;Sim&quot;</StatusBadge> : null}
          </div>
          <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        {row.medicalStatus === "pending_review" ? (
          <Button asChild size="sm" className="min-h-10">
            <Link href={adminEnrollmentPath(row.studentId)}>Conferir atestado</Link>
          </Button>
        ) : null}
        {needsMedical || needsParq ? (
          <RequestForm row={row} returnTo={returnTo} needsMedical={needsMedical} needsParq={needsParq} />
        ) : null}
        <Button asChild size="sm" variant="ghost" className="min-h-10">
          <Link href={adminEnrollmentPath(row.studentId)} aria-label={`Abrir ficha de ${row.fullName}`}>
            Ficha
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
  );
}

function RequestForm({
  row,
  returnTo,
  needsMedical,
  needsParq,
}: {
  row: StudentComplianceAssessment;
  returnTo: string;
  needsMedical: boolean;
  needsParq: boolean;
}) {
  const what = needsMedical && needsParq ? "atestado e PAR-Q" : needsMedical ? "atestado" : "PAR-Q";
  const title = needsMedical && needsParq ? "Atestado médico e PAR-Q" : needsMedical ? "Atestado médico" : "Questionário de saúde (PAR-Q)";
  const body = [
    needsMedical
      ? row.medicalStatus === "expiring_soon" && row.medicalExpiresAt
        ? `Seu atestado médico vence em ${formatBusinessDateBr(row.medicalExpiresAt)}. Envie o novo em Cadastro › Ficha.`
        : "Precisamos do seu atestado médico. Envie em Cadastro › Ficha."
      : null,
    needsParq
      ? row.parqStatus === "expiring_soon" && row.parqExpiresAt
        ? `O questionário de saúde (PAR-Q) vence em ${formatBusinessDateBr(row.parqExpiresAt)}. Renove em Cadastro › Saúde.`
        : "Preencha o questionário de saúde (PAR-Q) em Cadastro › Saúde."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form action={sendTargetedNotificationAction}>
      <input type="hidden" name="profile_id" value={row.profileId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="action_url" value={needsMedical ? ROUTES.studentEnrollment : ROUTES.studentParq} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      <FormSubmitButton
        size="sm"
        variant={row.medicalStatus === "pending_review" ? "outline" : "default"}
        className="min-h-10"
        pendingLabel="Enviando…"
        aria-label={`Pedir ${what} para ${row.fullName}`}
      >
        <Bell className="size-3.5" aria-hidden="true" />
        Pedir {what}
      </FormSubmitButton>
    </form>
  );
}
