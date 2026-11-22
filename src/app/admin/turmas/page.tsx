import { Suspense } from "react";
import { ClassManager } from "@/features/classes/components/class-manager";
import { listTrainingClasses } from "@/features/classes/service";
import { listLocations } from "@/features/locations/locations-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineCardsSkeleton } from "@/components/skeletons";

async function ClassManagerSection({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const [classes, locations, query] = await Promise.all([
    listTrainingClasses(true),
    listLocations(),
    searchParams,
  ]);
  const notice = query.error
    ? "Não foi possível salvar a turma. Confira os dias e horários."
    : query.created
      ? "Turma criada com sucesso."
      : query.updated
        ? "Turma atualizada com sucesso."
        : undefined;

  return (
    <ClassManager
      classes={toClientData(classes)}
      locations={toClientData(locations)}
      notice={notice}
      noticeTone={query.error ? "error" : "success"}
    />
  );
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
      title="Turmas"
      subtitle="Horários, locais e a chamada de cada turma."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<InlineCardsSkeleton count={6} columns={3} label="Carregando turmas…" />}>
          <ClassManagerSection searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
