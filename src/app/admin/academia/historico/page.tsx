import { PortalShell } from "@/components/dashboard/portal-shell";
import { HistoryTimeline } from "@/features/academy/components/history-timeline";
import { getConfigHistory } from "@/features/academy/history-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyHistoryPage() {
  const admin = await requireProfile("admin");
  const entries = await getConfigHistory(admin);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminAcademyHistory}
      title="Histórico de alterações"
      subtitle="Tudo que mudou nas configurações da academia, com a diferença de cada alteração e a opção de restaurar uma versão."
      breadcrumbs={[{ label: "Configurações da academia", href: ROUTES.adminAcademy }, { label: "Histórico" }]}
    >
      <div className="w-full min-w-0">
        <HistoryTimeline entries={entries} />
      </div>
    </PortalShell>
  );
}
