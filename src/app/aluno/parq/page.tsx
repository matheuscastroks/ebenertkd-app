import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { CardGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
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
        title="Complete sua ficha de matrícula primeiro"
        description="Após iniciar sua matrícula, você poderá preencher e assinar o Questionário de Prontidão para Atividade Física (PAR-Q)."
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.studentEnrollment}>Ir para matrícula</Link>
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
      activePath={ROUTES.studentParq}
      title="PAR-Q anual"
      subtitle="Questionário de Prontidão para Atividade Física e Termo de Responsabilidade (validade de 12 meses)."
      breadcrumbs={[{ label: "PAR-Q anual" }]}
    >
      <div className="mx-auto w-full max-w-4xl min-w-0 space-y-5">
        {query.submitted ? (
          <OperationToast
            tone="success"
            title="PAR-Q anual registrado com sucesso"
            description="Sua declaração e assinatura digital foram salvas com validade de 12 meses."
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
          <StudentParqContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
