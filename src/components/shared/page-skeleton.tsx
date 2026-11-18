import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mesma geometria do cabeçalho do `DashboardShell` sobre `bg-sidebar`:
 * título `text-2xl` (32px de linha) e subtítulo `text-sm` (20px de linha).
 */
export function PageHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-between gap-4 bg-sidebar px-4 pb-3 pt-4 md:px-6 md:pb-3.5 md:pt-4"
    >
      <div className="space-y-1">
        <div className="flex h-8 items-center">
          <Skeleton className="h-7 w-56 max-w-full rounded-lg" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="size-10 shrink-0 rounded-full" />
    </div>
  );
}

export function PageSkeleton({
  metrics = true,
  metricCount = 4,
  rows = 4,
}: {
  metrics?: boolean;
  metricCount?: number;
  rows?: number;
}) {
  return (
    <div
      role="status"
      className="flex min-h-0 flex-1 flex-col bg-sidebar md:overflow-hidden"
      aria-label="Carregando conteúdo"
      aria-busy="true"
    >
      <PageHeaderSkeleton />

      <div className="flex min-h-0 flex-1 flex-col gap-6 border-t border-border/60 bg-background p-4 md:mb-2 md:mr-2 md:overflow-y-auto md:rounded-xl md:border md:border-border/60 md:p-6 md:shadow-sm">
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
      </div>
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
}
