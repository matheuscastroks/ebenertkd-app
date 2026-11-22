import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function InlineTableSkeleton({
  headers,
  rows = 5,
  label = "Carregando dados…",
}: {
  headers: readonly string[];
  rows?: number;
  label?: string;
}) {
  return (
    <ResponsiveDataView
      desktop={
        <div
          role="status"
          aria-label={label}
          aria-busy="true"
          className="overflow-hidden rounded-xl bg-card shadow-xs"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {headers.map((header, idx) => (
                  <TableHead key={`${header}-${idx}`}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }, (_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {headers.map((_, colIdx) => (
                    <TableCell key={colIdx}>
                      <Skeleton className={colIdx === 0 ? "h-4 w-36" : "h-4 w-24"} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <span className="sr-only">{label}</span>
        </div>
      }
      mobile={
        <div
          role="status"
          aria-label={label}
          aria-busy="true"
          className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs"
        >
          {Array.from({ length: rows }, (_, idx) => (
            <div key={idx} className="space-y-2 p-4">
              <Skeleton className="h-4 w-44 max-w-[75%]" />
              <Skeleton className="h-3.5 w-60 max-w-[90%]" />
            </div>
          ))}
          <span className="sr-only">{label}</span>
        </div>
      }
    />
  );
}
