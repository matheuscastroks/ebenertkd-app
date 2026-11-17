import { CancellationsList } from "@/features/contracts/components/cancellations-list";
import { ConfirmationForm } from "@/features/billing/components/confirmation-form";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { Suspense } from "react";
import { decideCancellationAction } from "@/app/actions/cancellations";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ListItemsSkeleton } from "@/components/skeletons";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { getContract } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { AlertTriangle, Calendar, CheckCircle2, Clock, UserRound, XCircle } from "lucide-react";

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
      activePath={ROUTES.adminContracts}
      title="Solicitações de cancelamento"
      subtitle="A taxa sugerida leva em conta o aviso prévio até o dia 20; a decisão de isenção ou cobrança cabe ao professor."
      breadcrumbs={[
        { label: "Contratos", href: ROUTES.adminContracts },
        { label: "Cancelamentos" },
      ]}
    >
      <OperationToast
        tone="success"
        title="Decisão registrada com sucesso"
        description="A solicitação de cancelamento foi atualizada e o status arquivado."
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
