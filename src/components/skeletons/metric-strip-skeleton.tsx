import { Skeleton } from "@/components/ui/skeleton";

export function MetricStripSkeleton({
  items,
  label = "Carregando indicadores…",
}: {
  items: readonly { label: string; hint?: string }[];
  label?: string;
}) {
  return (
    <dl
      aria-label={label}
      aria-busy="true"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs sm:divide-x sm:divide-y-0"
    >
      {items.map((item) => (
        <div key={item.label} className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
          <dd className="mt-1">
            <Skeleton className="h-8 w-20" />
          </dd>
          {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </dl>
  );
}
