import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { ListItemsSkeleton } from "@/components/skeletons";
import { CancellationsList } from "@/features/contracts/components/cancellations-list";
import { requireProfile } from "@/lib/auth/session";

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const [admin, query] = await Promise.all([
    requireProfile("admin"),
    searchParams,
  ]);

  return (
    <PortalShell
      profile={admin}
      title="Contratos"
      subtitle="Decida os pedidos de rescisão e a taxa de cada um."
    >
      <OperationToast
        tone="success"
        title="Decisão registrada"
        description="O aluno foi notificado da decisão."
        id="cancellation-updated"
        clearParams={["updated"]}
        enabled={Boolean(query.updated)}
      />
      <OperationToast
        tone="error"
        title="Não foi possível registrar a decisão"
        description="Revise os valores e justificativa informados e tente novamente."
        id="cancellation-error"
        clearParams={["error"]}
        enabled={Boolean(query.error)}
      />

      <div className="w-full min-w-0 space-y-4">
        <Suspense fallback={<ListItemsSkeleton count={3} />}>
          <CancellationsList />
        </Suspense>
      </div>
    </PortalShell>
  );
}
