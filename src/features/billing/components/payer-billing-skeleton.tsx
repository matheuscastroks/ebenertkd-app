import { Skeleton } from "@/components/ui/skeleton";

export function PayerBillingSkeleton() {
  return <div className="space-y-5" aria-busy="true" aria-label="Carregando pagamentos">
    <div className="flex flex-wrap gap-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-8 w-24 rounded-md" />)}</div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
    <div className="overflow-hidden rounded-xl border"><div className="grid grid-cols-5 gap-4 border-b p-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}</div>{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-5 gap-4 border-b p-4 last:border-0"><Skeleton className="col-span-2 h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>)}</div>
    <span className="sr-only">Carregando pagamentos…</span>
  </div>;
}
