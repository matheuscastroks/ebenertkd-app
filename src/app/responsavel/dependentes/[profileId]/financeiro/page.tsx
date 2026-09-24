import { PortalShell } from "@/components/dashboard/portal-shell";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianBillingPage({ params }: { params: Promise<{ profileId: string }> }) {
  const actor = await requireCapability("guardian");
  const { profileId } = await params;
  return <PortalShell profile={actor} activePath={ROUTES.guardianDependents} title="Financeiro do dependente" subtitle="Acompanhe cobranças e envie comprovantes em nome do aluno."><PayerBilling actor={actor} profileId={profileId} /></PortalShell>;
}
