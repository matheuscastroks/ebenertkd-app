import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="space-y-6" aria-label="Carregando conteúdo" aria-busy="true">
      {/* Cabeçalho limpo sem bordas artificiais que causam layout shift */}
      <div className="space-y-2 pb-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {metrics ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metricCount }, (_, index) => (
            <div key={index} className="rounded-xl border bg-card p-5 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border bg-card p-5">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
}
