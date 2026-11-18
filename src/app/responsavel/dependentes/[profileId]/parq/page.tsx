import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { CardGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import { DependentContext } from "@/features/families/components/dependent-context";
import { ParqForm } from "@/features/students/components/parq-form";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getParqContextForActor } from "@/features/students/parq-service";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr, saoPauloToday } from "@/lib/dates";
import { guardianEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

async function GuardianParqContent({
  guardian,
  profileId,
}: {
  guardian: Profile;
  profileId: string;
}) {
  const { student, latest, canSign } = await getParqContextForActor(guardian, profileId);

  if (!student) {
    return (
      <EmptyState
        title="Ficha de matrícula ainda não iniciada"
        description="Preencha primeiro a ficha de matrícula do dependente para liberar o questionário PAR-Q anual."
        action={
          <Button asChild className="min-h-11">
            <Link href={guardianEnrollmentPath(profileId)}>Ir para matrícula</Link>
          </Button>
        }
      />
    );
  }

  const today = saoPauloToday();
  const assessment = evaluateParqStatus(latest, today);

  return (
    <ParqForm
      studentName={student.full_name}
      defaultSignerName={guardian.full_name}
      profileId={profileId}
      assessment={assessment}
      canSign={canSign}
      enrollmentHref={guardianEnrollmentPath(profileId)}
      todayBr={formatBusinessDateBr(today)}
    />
  );
}

export default async function GuardianParqPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const [guardian, { profileId }, query] = await Promise.all([
    requireCapability("guardian"),
    params,
    searchParams,
  ]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      breadcrumbs={[{ label: "Minha família", href: ROUTES.guardian }, { label: "PAR-Q anual" }]}
      title="PAR-Q anual"
      subtitle="Questionário de Prontidão para Atividade Física e Termo de Responsabilidade do dependente."
    >
      <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6">
        <DependentContext guardian={guardian} profileId={profileId} section="parq" />

        {query.submitted ? (
          <OperationToast
            tone="success"
            title="PAR-Q anual registrado com sucesso"
            description="A declaração e a assinatura do responsável foram salvas com validade de 12 meses."
            clearParams={["submitted"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível salvar o PAR-Q"
            description="Responda todas as 10 perguntas, aceite o termo de responsabilidade e adicione sua assinatura."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<CardGridSkeleton count={2} columns={1} />}>
          <GuardianParqContent guardian={guardian} profileId={profileId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
