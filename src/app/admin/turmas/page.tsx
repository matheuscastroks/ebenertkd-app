import { Suspense } from "react";
import { ClassManager } from "@/features/classes/components/class-manager";
import { listTrainingClasses } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { CardGridSkeleton } from "@/components/skeletons";
import { ROUTES } from "@/lib/navigation/routes";

async function ClassManagerSection({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const [classes, query] = await Promise.all([listTrainingClasses(true), searchParams]);
  const notice = query.error
    ? "Não foi possível salvar a turma. Confira os dias e horários."
    : query.created
      ? "Turma criada com sucesso."
      : query.updated
        ? "Turma atualizada com sucesso."
        : undefined;

  return <ClassManager classes={toClientData(classes)} notice={notice} />;
}

export default async function TrainingClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminClasses}
      title="Turmas e horários"
      subtitle="Defina os horários e dojangs disponíveis para treinos e matrículas."
      breadcrumbs={[{ label: "Turmas e horários" }]}
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<CardGridSkeleton count={4} columns={2} />}>
          <ClassManagerSection searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
