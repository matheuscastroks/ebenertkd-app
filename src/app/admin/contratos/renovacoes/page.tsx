import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { RenewalFilters } from "@/features/contracts/components/renewal-filters";
import { requireProfile } from "@/lib/auth/session";
import { parseRenewalBucket, RenewalsContent } from "./renewals-content";

type SearchParams = Promise<{
  q?: string;
  bucket?: string;
  updated?: string;
  error?: string;
}>;

export default async function AdminContractRenewalsPage({ searchParams }: { searchParams: SearchParams }) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);
  const bucket = parseRenewalBucket(params.bucket);

  return (
    <PortalShell profile={admin} title="Contratos" subtitle="Contratos vencidos ou perto do fim, prontos para renovar.">
      <div className="w-full min-w-0 space-y-4">
        {params.updated === "renewal" ? (
          <OperationToast
            tone="success"
            title="Contrato renovado e enviado"
            description="O novo contrato foi gerado e aguarda a assinatura no portal."
            clearParams={["updated"]}
          />
        ) : null}
        {params.error === "renewal" ? (
          <OperationToast
            tone="error"
            title="Não foi possível renovar o contrato"
            description="Verifique se há um modelo publicado e se a nova data é posterior à vigência atual."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <RenewalFilters />
        </Suspense>

        <Suspense key={`${bucket ?? ""}|${params.q ?? ""}`} fallback={<InlineRowsSkeleton rows={5} label="Carregando renovações…" />}>
          <RenewalsContent bucket={bucket} search={params.q?.trim() || undefined} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
