import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CardGridSkeleton({
  count = 4,
  columns = 2,
  className,
}: {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      aria-label="Carregando cartões…"
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
        <Card key={idx} className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </CardHeader>
          <CardContent className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Carregando cartões…</span>
    </div>
  );
}
