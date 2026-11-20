import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/plus";
import { Skeleton } from "@/components/ui/skeleton";
import { splitAgenda } from "@/features/events/agenda";
import { EventCard } from "@/features/events/components/event-card";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { getEventsOverview } from "@/features/events/event-service";
import { EVENT_TYPE_HINT, EVENT_TYPE_LABEL } from "@/features/events/labels";
import { EVENT_TYPES, type EventType } from "@/features/events/types";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const FILTER_LABEL: Record<Exclude<EventType, "belt_exam">, string> = {
  championship: "Campeonatos",
  seminar: "Aulões e seminários",
  social: "Confraternizações",
  other: "Outros"
};

const FILTER_TYPES = EVENT_TYPES.filter((item): item is Exclude<EventType, "belt_exam"> => item !== "belt_exam");

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

async function EventsContent({ type }: { type?: EventType }) {
  const all = await getEventsOverview();
  const events = type ? all.filter((item) => item.event.event_type === type) : all;
  const { upcoming, past } = splitAgenda(events);

  if (events.length === 0) {
    const label = type ? EVENT_TYPE_LABEL[type].toLowerCase() : "evento";
    return (
      <EmptyState
        title={type ? `Nenhum ${label} cadastrado` : "Nenhum evento cadastrado"}
        description={type ? `${EVENT_TYPE_HINT[type]} Use Novo evento para cadastrar o primeiro.` : "Cadastre exames, aulões, seminários e confraternizações para receber inscrições dos alunos."}
        action={
          <Button asChild className="min-h-11">
            <Link href={ROUTES.adminEventNew}>Novo evento</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="eventos-proximos">
        <h2 id="eventos-proximos" className="text-base font-semibold">
          Próximos
        </h2>
        {upcoming.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {upcoming.map((item) => (
              <EventCard key={item.event.$id} data={item} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Nenhum evento à frente. Use Novo evento para agendar o próximo.</p>
        )}
      </section>
      {past.length ? (
        <section className="space-y-3" aria-labelledby="eventos-passados">
          <h2 id="eventos-passados" className="text-base font-semibold">
            Passados e cancelados
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {past.map((item) => (
              <EventCard key={item.event.$id} data={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ tipo?: string; ok?: string; erro?: string }> }) {
  const [admin, query] = await Promise.all([requireProfile("admin"), searchParams]);
  const type = EVENT_TYPES.find((item) => item === query.tipo);

  return (
    <PortalShell
      profile={admin}
      title="Eventos"
      subtitle="Aulões, seminários, campeonatos e confraternizações."
      headerActions={
        <Button asChild className="min-h-11">
          <Link href={ROUTES.adminEventNew}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Novo evento
          </Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <EventFeedback ok={query.ok} erro={query.erro} />
        <FilterChips
          label="Tipo de evento"
          items={[
            { label: "Todos", href: ROUTES.adminEvents, active: !type },
            // Exames de faixa têm segmento próprio; aqui ficam só os outros tipos.
            ...FILTER_TYPES.map((item) => ({ label: FILTER_LABEL[item], href: `${ROUTES.adminEvents}?tipo=${item}`, active: type === item })),
          ]}
        />
        <Suspense fallback={<EventsSkeleton />}>
          <EventsContent type={type} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
