import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { HistoryTimeline } from "@/features/academy/components/history-timeline";
import { getConfigHistory } from "@/features/academy/history-service";
import type { Profile } from "@/features/auth/types";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function HistoryTimelineLoader({ admin }: { admin: Profile }) {
  const entries = await getConfigHistory(admin);
  return <HistoryTimeline entries={entries} />;
}

export default async function AdminAcademyHistoryPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Histórico de alterações"
      subtitle="Tudo que mudou nas configurações da academia, com a diferença de cada alteração e a opção de restaurar uma versão."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando histórico…" />}>
          <HistoryTimelineLoader admin={admin} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
