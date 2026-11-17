import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function RouteLoading() {
  return (
    <div role="status" aria-label="Carregando página" aria-busy="true" className="space-y-6">
      <span className="sr-only">Carregando página…</span>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
