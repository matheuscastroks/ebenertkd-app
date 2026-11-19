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
import { getPolicy } from "@/features/academy/config-service";
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
        title="Preencha a matrícula primeiro"
        description="Assim que a matrícula do dependente for iniciada, o questionário de saúde anual ficará disponível aqui."
        action={
          <Button asChild className="min-h-11">
            <Link href={guardianEnrollmentPath(profileId)}>Ir para matrícula</Link>
          </Button>
        }
      />
    );
  }

  const today = saoPauloToday();
  const assessment = evaluateParqStatus(latest, today, await getPolicy("compliance"));

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
      breadcrumbs={[{ label: "Minha família", href: ROUTES.guardian }, { label: "Questionário de saúde" }]}
      title="Questionário de saúde"
      subtitle="10 perguntas rápidas preenchidas uma vez por ano pelo responsável."
    >
      <div className="w-full min-w-0 space-y-6">
        <DependentContext guardian={guardian} profileId={profileId} section="parq" />

        {query.submitted ? (
          <OperationToast
            tone="success"
            title="Questionário de saúde salvo"
            description="As respostas e a assinatura do responsável foram registradas com validade de 1 ano."
            clearParams={["submitted"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar as respostas"
            description="Confira se todas as 10 perguntas foram respondidas, aceite o termo e adicione sua assinatura."
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
