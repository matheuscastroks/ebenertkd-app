import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { requireProfile } from "@/lib/auth/session";
import { MonthlyClosingContent } from "./closing-content";

type SearchParams = Promise<{ competence?: string }>;

async function ClosingFromParams({ searchParams }: { searchParams: SearchParams }) {
  const { competence } = await searchParams;
  return <MonthlyClosingContent competence={competence} />;
}

export default async function AdminBillingClosingPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell profile={admin} title="Financeiro" subtitle="Feche o mês: resolva as pendências e confira o resultado.">
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <InlineRowsSkeleton rows={4} label="Carregando pendências do mês…" />
              <InlineRowsSkeleton rows={4} label="Carregando resumo do fechamento…" />
            </div>
          }
        >
          <ClosingFromParams searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
