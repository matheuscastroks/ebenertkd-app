import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ metrics = true, rows = 4 }: { metrics?: boolean; rows?: number }) {
  return <main className="min-h-screen bg-background p-4 md:p-6" aria-label="Carregando página" aria-busy="true"><div className="mx-auto max-w-7xl space-y-6"><div className="flex items-center gap-3 rounded-xl border p-4"><Skeleton className="size-8 rounded-lg" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div></div>{metrics ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div> : null}<div className="space-y-3 rounded-xl border p-4"><Skeleton className="h-9 w-full" />{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div></div><span className="sr-only">Carregando conteúdo…</span></main>;
}
