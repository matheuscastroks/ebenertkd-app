import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { EventWizard } from "@/features/events/components/event-wizard";
import { listLocations } from "@/features/locations/locations-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function EventWizardLoader() {
  const locations = await listLocations();
  return <EventWizard locations={locations} />;
}

export default async function NewEventPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Eventos", href: ROUTES.adminEvents }}
      title="Novo evento"
      subtitle="Campeonato, aulão, seminário, confraternização ou outro evento com inscrições."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando formulário de evento…" />}>
          <EventWizardLoader />
        </Suspense>
      </div>
    </PortalShell>
  );
}
