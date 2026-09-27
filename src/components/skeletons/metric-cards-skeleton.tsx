import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MetricCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-label="Carregando métricas…"
      aria-busy="true"
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        count >= 4 ? "xl:grid-cols-4" : count === 3 ? "xl:grid-cols-3" : "",
        className
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      ))}
      <span className="sr-only">Carregando métricas…</span>
    </div>
  );
}
