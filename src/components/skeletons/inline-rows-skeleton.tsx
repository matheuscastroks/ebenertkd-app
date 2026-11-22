import { Skeleton } from "@/components/ui/skeleton";

export function InlineRowsSkeleton({
  rows = 3,
  label = "Carregando itens…",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs"
    >
      {Array.from({ length: rows }, (_, idx) => (
        <div key={idx} className="space-y-2 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-4 w-48 max-w-[70%]" />
          <Skeleton className="h-3.5 w-72 max-w-[90%]" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
