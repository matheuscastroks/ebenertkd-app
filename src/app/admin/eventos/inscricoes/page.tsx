import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { requireProfile } from "@/lib/auth/session";
import { HubContent } from "./hub-content";

export default async function EventRegistrationsHubPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [admin, query] = await Promise.all([requireProfile("admin"), searchParams]);
  return (
    <PortalShell profile={admin} title="Eventos" subtitle="Inscrições que esperam uma ação sua.">
      <div className="w-full min-w-0 space-y-4">
        <EventFeedback ok={query.ok} erro={query.erro} />
        <Suspense fallback={<ListItemsSkeleton count={4} />}>
          <HubContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
