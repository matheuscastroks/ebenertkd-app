import { Skeleton } from "@/components/ui/skeleton";

export function AttendanceCalendarSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando calendário">
      <div className="rounded-xl border p-5">
        <p className="text-sm text-muted-foreground">Frequência no mês</p>
        <Skeleton className="mt-2 h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card lg:grid-cols-[20rem_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        <div className="p-5">
          <p className="font-medium">Calendário de treinos</p>
          <Skeleton className="mt-4 h-72 w-full" />
        </div>
        <div className="p-5">
          <p className="font-medium">Detalhes do dia</p>
          <Skeleton className="mt-4 h-16 w-full" />
        </div>
      </div>
      <span className="sr-only">Carregando calendário…</span>
    </div>
  );
}
