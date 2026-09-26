import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { PayerBillingSkeleton } from "@/features/billing/components/payer-billing-skeleton";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianBillingPage({
  params,
  searchParams
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ view?: string; updated?: string; error?: string }>;
}) {
  const actor = await requireCapability("guardian");
  const [{ profileId }, query] = await Promise.all([params, searchParams]);

  return (
    <PortalShell
      profile={actor}
      activePath={ROUTES.guardianDependents}
      breadcrumbs={[
        { label: "Dependentes", href: ROUTES.guardianDependents },
        { label: "Financeiro" }
      ]}
      title="Financeiro do dependente"
      subtitle="Acompanhe as mensalidades e envie comprovantes de pagamento em nome do aluno."
    >
      <div className="w-full min-w-0 space-y-4">
        {query.updated ? (
          <OperationToast
            tone="success"
            title="Comprovante enviado"
            description="O comprovante foi encaminhado para conferência do professor."
            clearParams={["updated"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível enviar o comprovante"
            description="Confira se o arquivo é uma imagem ou PDF válido de até 5 MB."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<PayerBillingSkeleton />}>
          <PayerBilling
            actor={actor}
            profileId={profileId}
            view={query.view === "history" ? "history" : "open"}
          />
        </Suspense>
      </div>
    </PortalShell>
  );
}
