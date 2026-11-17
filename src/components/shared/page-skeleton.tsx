import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mesma geometria do cabeçalho do `DashboardShell`: barra de ferramentas (só no desktop),
 * título `text-2xl` (32px de linha) e subtítulo `text-sm` (20px de linha).
 */
export function PageHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="hidden min-h-8 items-center md:flex">
        <Skeleton className="size-6 rounded-lg" />
      </div>
      <div className="space-y-1">
        <div className="flex h-8 items-center">
          <Skeleton className="h-7 w-56 max-w-full rounded-lg" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({
  metrics = true,
  metricCount = 4,
  rows = 4
}: {
  metrics?: boolean;
  metricCount?: number;
  rows?: number;
}) {
  return (
    <div role="status" className="flex flex-col gap-6" aria-label="Carregando conteúdo" aria-busy="true">
      <PageHeaderSkeleton />

      {metrics ? (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metricCount }, (_, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
          ))}
        </div>
      ) : null}

      <div aria-hidden="true" className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
}
