import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/shared/page-skeleton";

/**
 * Carregamento entre rotas: repete o cabeçalho da página e um bloco de conteúdo,
 * para que título e primeiro card não "pulem" quando a página real chega.
 */
export function RouteLoading() {
  return (
    <div role="status" aria-label="Carregando página" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Carregando página…</span>
      <PageHeaderSkeleton />
      <div aria-hidden="true" className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
