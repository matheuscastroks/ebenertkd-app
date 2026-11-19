import { PortalShell } from "@/components/dashboard/portal-shell";
import { EventWizard } from "@/features/events/components/event-wizard";
import { listLocations } from "@/features/locations/locations-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function NewEventPage() {
  const [admin, locations] = await Promise.all([requireProfile("admin"), listLocations()]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminEvents}
      title="Novo evento"
      subtitle="Campeonato, aulão, seminário, confraternização ou outro evento com inscrições."
      breadcrumbs={[{ label: "Eventos", href: ROUTES.adminEvents }, { label: "Novo evento" }]}
    >
      <div className="w-full min-w-0">
        <EventWizard locations={locations} />
      </div>
    </PortalShell>
  );
}
