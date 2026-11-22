import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { InlineTableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingFilters, BillingToolbar } from "@/features/billing/components/billing-filters";
import { listTrainingClasses } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { BillingResults, type BillingQuery } from "./billing-results";

type PageQuery = BillingQuery & { error?: string; updated?: string };

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const actor = await requireProfile("admin");
  const params = await searchParams;
  const queryKey = JSON.stringify([params.status, params.competence, params.student, params.trainingClass, params.type, params.page]);

  return (
    <PortalShell
      profile={actor}
      title="Financeiro"
      subtitle="Confira comprovantes, registre pagamentos e cobre quem está em atraso."
      headerActions={<Suspense fallback={<Skeleton className="h-11 w-32 rounded-xl" />}><BillingToolbar /></Suspense>}
    >
      <div className="w-full min-w-0 space-y-4">
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível concluir a operação"
            description="Revise os dados e tente novamente."
            clearParams={["error"]}
          />
        ) : null}
        {params.updated ? (
          <OperationToast tone="success" title="Operação registrada" clearParams={["updated"]} />
        ) : null}

        <Suspense fallback={<Skeleton className="h-16 w-full rounded-xl" />}>
          <BillingFiltersContent />
        </Suspense>

        <Suspense
          key={queryKey}
          fallback={
            <InlineTableSkeleton
              headers={["Aluno", "Competência", "Vencimento", "Valor", "Status", "Ações"]}
              rows={6}
              label="Carregando cobranças…"
            />
          }
        >
          <BillingResults params={params} />
        </Suspense>
      </div>
    </PortalShell>
  );
}

async function BillingFiltersContent() {
  const classes = await listTrainingClasses(true);
  return <BillingFilters classes={toClientData(classes)} />;
}
