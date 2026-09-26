import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ListItemsSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div
      aria-label="Carregando itens…"
      aria-busy="true"
      className="space-y-3"
    >
      {Array.from({ length: count }, (_, idx) => (
        <Card key={idx} className="border-border/80 shadow-xs">
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Skeleton className="size-10 rounded-xl shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Carregando itens…</span>
    </div>
  );
}
