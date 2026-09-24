import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ metrics = true, rows = 4 }: { metrics?: boolean; rows?: number }) {
  return <div className="space-y-6" aria-label="Carregando conteúdo" aria-busy="true"><div className="flex min-h-24 items-center gap-3 rounded-xl border bg-background p-4"><Skeleton className="size-8 rounded-lg" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div></div>{metrics ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div> : null}<div className="space-y-3 rounded-xl border p-4"><Skeleton className="h-9 w-full" />{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div><span className="sr-only">Carregando conteúdo…</span></div>;
}
