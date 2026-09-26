import { ClassManager } from "@/features/classes/components/class-manager";
import { listTrainingClasses } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { PortalShell } from "@/components/dashboard/portal-shell";

export default async function TrainingClassesPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; error?: string }> }) {
  const admin = await requireProfile("admin");
  const [classes, query] = await Promise.all([listTrainingClasses(true), searchParams]);
  const notice = query.error ? "Não foi possível salvar a turma. Confira os dias e horários." : query.created ? "Turma criada com sucesso." : query.updated ? "Turma atualizada com sucesso." : undefined;
  return (
    <PortalShell
      profile={admin}
      activePath="/admin/turmas"
      title="Turmas e horários"
      subtitle="Defina os horários e dojangs disponíveis para treinos e matrículas."
    >
      <div className="w-full min-w-0">
        <ClassManager classes={toClientData(classes)} notice={notice} />
      </div>
    </PortalShell>
  );
}
