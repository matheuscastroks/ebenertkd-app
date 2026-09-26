import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TableRowsSkeleton({
  columns = 5,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <ResponsiveDataView
      desktop={
        <div
          aria-label="Carregando tabela…"
          aria-busy="true"
          className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {Array.from({ length: columns }, (_, colIdx) => (
                  <TableHead key={colIdx}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }, (_, rowIdx) => (
                <TableRow key={rowIdx}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full shrink-0" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  {Array.from({ length: columns - 2 }, (_, colIdx) => (
                    <TableCell key={colIdx}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-20 ml-auto rounded-lg" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <span className="sr-only">Carregando dados da tabela…</span>
        </div>
      }
      mobile={
        <div
          aria-label="Carregando lista…"
          aria-busy="true"
          className="space-y-3"
        >
          {Array.from({ length: rows }, (_, idx) => (
            <Card key={idx} className="border-border/80 shadow-xs">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
          <span className="sr-only">Carregando registros…</span>
        </div>
      }
    />
  );
}
