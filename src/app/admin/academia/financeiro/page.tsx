import { PortalShell } from "@/components/dashboard/portal-shell";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { AccessPolicyForm } from "@/features/academy/components/access-policy-form";
import { BillingPolicyForm } from "@/features/academy/components/billing-policy-form";
import { PixSettingsForm } from "@/features/academy/components/pix-settings-form";
import { getBillingSettings } from "@/features/billing/settings-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyFinancePage() {
  const admin = await requireProfile("admin");
  const [billing, access, pix] = await Promise.all([getPolicyForEdit("billing"), getPolicyForEdit("access"), getBillingSettings().catch(() => null)]);

  return (
    <PortalShell
      profile={admin} back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Financeiro da academia"
      subtitle="Mensalidade padrão, taxa de matrícula, vencimentos, PIX e a regra de acesso ao aplicativo."
    >
      <div className="w-full space-y-8">
        <BillingPolicyForm policy={billing.policy} revision={billing.revision} />
        <PixSettingsForm settings={toClientData(pix)} />
        <AccessPolicyForm policy={access.policy} revision={access.revision} />
      </div>
    </PortalShell>
  );
}
