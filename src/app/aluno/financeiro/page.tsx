import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { PayerBillingSkeleton } from "@/features/billing/components/payer-billing-skeleton";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentBillingPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; updated?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  const query = await searchParams;

  if (profile.role === "minor_student") redirect(ROUTES.student);

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentBilling}
      title="Financeiro e mensalidades"
      subtitle="Consulte suas cobranças, copie a chave PIX da academia e envie seus comprovantes."
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
          <PayerBilling actor={profile} view={query.view === "history" ? "history" : "open"} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
