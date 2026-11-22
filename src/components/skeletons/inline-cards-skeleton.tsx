import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InlineCardsSkeleton({
  count = 2,
  columns = 2,
  label = "Carregando itens…",
  className,
}: {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        "grid gap-4",
        columns === 1
          ? "grid-cols-1"
          : columns === 2
            ? "sm:grid-cols-2"
            : columns === 3
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }, (_, idx) => (
        <div key={idx} className="space-y-3 rounded-xl bg-card p-5 shadow-xs">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
