import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/shared/page-skeleton";

/**
 * Carregamento entre rotas: repete o cabeçalho da página e um bloco de conteúdo,
 * para que título e primeiro card não "pulem" quando a página real chega.
 */
export function RouteLoading() {
  return (
    <div
      role="status"
      aria-label="Carregando página"
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col bg-sidebar md:overflow-hidden"
    >
      <span className="sr-only">Carregando página…</span>
      <PageHeaderSkeleton />
      <main
        data-slot="dashboard-content"
        className="relative flex min-h-0 flex-1 flex-col border-t border-border/60 bg-background md:mb-2 md:mr-2 md:overflow-y-auto md:rounded-xl md:border md:border-border/60 md:shadow-sm"
      >
        <div className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
          <div aria-hidden="true" className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-5">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
