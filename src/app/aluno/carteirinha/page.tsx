import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { CardGridSkeleton } from "@/components/skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import { getStudentAppAccessByStudentId } from "@/features/billing/access-lock-service";
import type { MedicalComplianceStatus } from "@/features/students/compliance-rules";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { PARQ_STATUS_LABELS, type ParqStatus } from "@/features/students/parq-rules";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, ShieldCheck } from "lucide-react";

const MEDICAL_LABELS: Record<MedicalComplianceStatus, string> = {
  valid: "Atestado em dia",
  expiring_soon: "Atestado vence em até 30 dias",
  expired: "Atestado vencido",
  pending_review: "Atestado em análise",
  missing: "Atestado pendente",
};

const MEDICAL_TONES: Record<MedicalComplianceStatus, StatusTone> = {
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

async function StudentCardContent({ profile }: { profile: Profile }) {
  const snapshot = await getStudentJourneySnapshot(profile);

  if (!snapshot.student || !snapshot.compliance) {
    return (
      <EmptyState
        title="Carteirinha disponível após preencher sua matrícula"
        description="Envie seus dados e foto na matrícula para gerar sua carteirinha digital do dojang."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Preencher matrícula</Link>
          </Button>
        }
      />
    );
  }

  const { student, enrollment, trainingClass, compliance } = snapshot;
  const isMinor = profile.role === "minor_student";
  const accessState = isMinor
    ? null
    : await getStudentAppAccessByStudentId(student.$id).catch(() => null);
  const studentCode = student.$id.slice(0, 8).toUpperCase();
  const isActive =
    student.status === "active" ||
    enrollment?.status === "active" ||
    enrollment?.status === "awaiting_renewal";

  const needsMedicalAction =
    compliance.medicalStatus === "expired" ||
    compliance.medicalStatus === "expiring_soon" ||
    compliance.medicalStatus === "missing";

  const needsParqAction =
    compliance.parqStatus === "expired" ||
    compliance.parqStatus === "expiring_soon" ||
    compliance.parqStatus === "missing";

  return (
    <div className="space-y-6">
      {needsMedicalAction ? (
        <Alert>
          <AlertTitle>{MEDICAL_LABELS[compliance.medicalStatus]}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {compliance.medicalStatus === "expiring_soon"
                ? `Seu atestado médico vence em ${formatBusinessDateBr(compliance.medicalExpiresAt)}. Envie a renovação anual na área de matrícula.`
                : "Mantenha seu atestado médico atualizado (validade de 12 meses) para treinar com segurança."}
            </span>
            <Button asChild size="sm" variant="outline" className="min-h-9">
              <Link href={ROUTES.studentEnrollment}>
                Atualizar atestado
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {needsParqAction ? (
        <Alert>
          <AlertTitle>{PARQ_STATUS_LABELS[compliance.parqStatus]}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {isMinor
                ? "O questionário anual de prontidão física (PAR-Q) precisa ser preenchido e assinado pelo responsável legal."
                : compliance.parqStatus === "expiring_soon"
                  ? `Seu PAR-Q anual vence em ${formatBusinessDateBr(compliance.parqExpiresAt)}. Renove agora pelo aplicativo.`
                  : "Preencha e assine o questionário oficial de prontidão para atividade física (PAR-Q) com validade anual."}
            </span>
            {!isMinor ? (
              <Button asChild size="sm" variant="outline" className="min-h-9">
                <Link href={ROUTES.studentParq}>
                  Preencher PAR-Q
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="digital-passport-heading"
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border"
        >
          <div className="flex items-center justify-between gap-3 bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary-text" aria-hidden="true" />
              <h2 id="digital-passport-heading" className="text-sm font-semibold text-foreground">
                Ebener Taekwondo · Passaporte do Aluno
              </h2>
            </div>
            <StatusBadge tone={isActive ? "success" : "warning"}>
              {isActive ? "Matrícula ativa" : "Em regularização"}
            </StatusBadge>
          </div>

          <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center">
            <StudentAvatar
              name={student.full_name}
              photoDocumentId={compliance.photoDocumentId}
              size="lg"
            />
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {student.full_name}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Código do aluno: #{studentCode}
                </p>
              </div>
              <BeltBadge belt={student.current_belt} gub={student.gub} size="md" />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Turma</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {trainingClass?.name ?? student.training_class ?? "A definir"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Praticante desde</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {formatBusinessDateBr(student.started_at_tkd ?? enrollment?.contract_start)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Atestado médico</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {compliance.medicalExpiresAt
                  ? `Até ${formatBusinessDateBr(compliance.medicalExpiresAt)}`
                  : MEDICAL_LABELS[compliance.medicalStatus]}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="health-compliance-heading"
          className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="health-compliance-heading" className="text-base font-semibold">
                Regularidade e ficha de saúde
              </h2>
              <StatusBadge tone={MEDICAL_TONES[compliance.medicalStatus]}>
                {MEDICAL_LABELS[compliance.medicalStatus]}
              </StatusBadge>
            </div>

            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Validade do atestado (12 meses)</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {compliance.medicalExpiresAt
                    ? formatBusinessDateBr(compliance.medicalExpiresAt)
                    : "Aguardando aprovação"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">PAR-Q anual (CREF1)</dt>
                <dd className="flex items-center gap-2">
                  <StatusBadge tone={PARQ_TONES[compliance.parqStatus]}>
                    {compliance.parqExpiresAt
                      ? `Até ${formatBusinessDateBr(compliance.parqExpiresAt)}`
                      : PARQ_STATUS_LABELS[compliance.parqStatus]}
                  </StatusBadge>
                </dd>
              </div>
              {!isMinor && accessState && accessState.status !== "not_applicable" ? (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">Ciclo mensal de acesso (30d)</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {accessState.accessValidUntil
                      ? `Válido até ${formatBusinessDateBr(accessState.accessValidUntil)}`
                      : "Ativo"}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Foto de identificação</dt>
                <dd>
                  <StatusBadge tone={compliance.hasApprovedPhoto ? "success" : "warning"}>
                    {compliance.hasApprovedPhoto ? "Aprovada" : "Pendente"}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Contato de emergência</dt>
                <dd className="text-right font-medium text-foreground">
                  {student.emergency_contact_name
                    ? `${student.emergency_contact_name}${student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ""}`
                    : "Não informado"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Alergias / restrições</dt>
                <dd className="text-right font-medium text-foreground">
                  {student.allergies?.trim() || student.health_details?.trim() || "Nenhuma declarada"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href={ROUTES.studentParq}>
                PAR-Q anual
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href={ROUTES.studentEnrollment}>
                Atualizar ficha médica
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function StudentCardPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentCard}
      title="Carteirinha e saúde"
      subtitle="Seu passaporte digital do dojang, validade anual do atestado médico e contatos de emergência."
      breadcrumbs={[{ label: "Carteirinha e saúde" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}>
          <StudentCardContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
