import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { IdentityForm } from "@/features/academy/components/identity-form";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function IdentityFormLoader() {
  const { revision, configured, ...identity } = await getAcademyIdentity();
  void configured;
  return <IdentityForm identity={toClientData(identity)} revision={revision} />;
}

export default async function AdminAcademyIdentityPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Identidade da academia"
      subtitle="Nomes, documento, contato e professor usados no aplicativo, nos contratos e nas mensagens."
    >
      <div className="w-full">
        <Suspense fallback={<InlineRowsSkeleton rows={4} label="Carregando identidade da academia…" />}>
          <IdentityFormLoader />
        </Suspense>
      </div>
    </PortalShell>
  );
}
