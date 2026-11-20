import { PortalShell } from "@/components/dashboard/portal-shell";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { IdentityForm } from "@/features/academy/components/identity-form";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyIdentityPage() {
  const admin = await requireProfile("admin");
  const { revision, configured, ...identity } = await getAcademyIdentity();
  void configured;

  return (
    <PortalShell
      profile={admin} back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Identidade da academia"
      subtitle="Nomes, documento, contato e professor usados no aplicativo, nos contratos e nas mensagens."
    >
      <div className="w-full">
        <IdentityForm identity={toClientData(identity)} revision={revision} />
      </div>
    </PortalShell>
  );
}
