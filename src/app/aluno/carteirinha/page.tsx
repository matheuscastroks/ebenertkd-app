import { getAcademyIdentity } from "@/features/academy/config-service";
import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { CardGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import type { MedicalComplianceStatus } from "@/features/students/compliance-rules";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { PARQ_STATUS_LABELS, type ParqStatus } from "@/features/students/parq-rules";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, ShieldCheck } from "@/components/ui/icons";

const MEDICAL_LABELS: Record<MedicalComplianceStatus, string> = {
  valid: "Atestado em dia",
  expiring_soon: "Atestado vence em breve",
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

function RowLink({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <Link href={href} aria-label={label} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

async function StudentCardContent({ profile }: { profile: Profile }) {
  const [snapshot, identity] = await Promise.all([getStudentJourneySnapshot(profile), getAcademyIdentity()]);

  if (!snapshot.student || !snapshot.compliance) {
    return (
      <EmptyState
        title="Preencha sua ficha para gerar a carteirinha"
        description="Com seus dados e foto, a carteirinha digital aparece aqui."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Preencher ficha</Link>
          </Button>
        }
      />
    );
  }

  const { student, enrollment, trainingClass, compliance } = snapshot;
  const isMinor = profile.role === "minor_student";
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="digital-passport-heading"
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border"
        >
          <div className="flex items-center justify-between gap-3 bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="digital-passport-heading" className="text-sm font-semibold text-foreground">
                {identity.display_name} · Passaporte do Aluno
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
              <BeltBadge rankKey={student.rank_key} size="md" />
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
                Saúde e documentos
              </h2>
              <StatusBadge tone={MEDICAL_TONES[compliance.medicalStatus]}>
                {MEDICAL_LABELS[compliance.medicalStatus]}
              </StatusBadge>
            </div>

            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Atestado válido até</dt>
                <dd className="flex items-center gap-2 font-medium tabular-nums text-foreground">
                  {compliance.medicalExpiresAt
                    ? formatBusinessDateBr(compliance.medicalExpiresAt)
                    : "Aguardando aprovação"}
                  {needsMedicalAction ? <RowLink href={ROUTES.studentEnrollment} label="Enviar novo atestado">Enviar</RowLink> : null}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">Questionário de saúde (PAR-Q)</dt>
                <dd className="flex items-center gap-2">
                  <StatusBadge tone={PARQ_TONES[compliance.parqStatus]}>
                    {compliance.parqExpiresAt
                      ? `Até ${formatBusinessDateBr(compliance.parqExpiresAt)}`
                      : PARQ_STATUS_LABELS[compliance.parqStatus]}
                  </StatusBadge>
                  {needsParqAction && !isMinor ? <RowLink href={ROUTES.studentParq} label="Responder o questionário de saúde">Responder</RowLink> : null}
                </dd>
              </div>
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
      title="Cadastro"
      subtitle="Sua carteirinha, a validade dos documentos de saúde e o contato de emergência."
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}>
          <StudentCardContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
