import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { CardGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getPolicy } from "@/features/academy/config-service";
import type { Profile } from "@/features/auth/types";
import { ParqForm } from "@/features/students/components/parq-form";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getParqContextForActor } from "@/features/students/parq-service";
import { requireCapability } from "@/lib/auth/session";
import { formatBusinessDateBr, saoPauloToday } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentParqContent({ profile }: { profile: Profile }) {
  const { student, latest, canSign } = await getParqContextForActor(profile);

  if (!student) {
    return (
      <EmptyState
        illustration="empty-journey"
        title="Preencha a ficha primeiro"
        description="Com a ficha preenchida, você pode responder o questionário de saúde."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Preencher ficha</Link>
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
      defaultSignerName={profile.full_name}
      assessment={assessment}
      canSign={canSign}
      enrollmentHref={ROUTES.studentEnrollment}
      todayBr={formatBusinessDateBr(today)}
    />
  );
}

export default async function StudentParqPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const [profile, query] = await Promise.all([requireCapability("student"), searchParams]);

  return (
    <PortalShell
      profile={profile}
      title="Cadastro"
      subtitle="Responda 10 perguntas rápidas uma vez por ano para treinar com segurança."
    >
      <div className="w-full min-w-0 space-y-6">
        {query.submitted ? (
          <OperationToast
            tone="success"
            title="Questionário de saúde salvo"
            description="Suas respostas foram registradas e valem por 1 ano."
            clearParams={["submitted"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar suas respostas"
            description="Confira se todas as 10 perguntas foram respondidas, aceite o termo e adicione sua assinatura."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<CardGridSkeleton count={2} columns={1} />}>
          <StudentParqContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
