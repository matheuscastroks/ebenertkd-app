import { PortalShell } from "@/components/dashboard/portal-shell";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianBillingPage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ view?: string }> }) {
  const actor = await requireCapability("guardian");
  const [{ profileId }, query] = await Promise.all([params, searchParams]);
  return <PortalShell profile={actor} activePath={ROUTES.guardianDependents} title="Financeiro do dependente" subtitle="Acompanhe cobranças e envie comprovantes em nome do aluno." breadcrumbs={[{ label: "Dependentes", href: ROUTES.guardianDependents }, { label: "Financeiro" }]}><PayerBilling actor={actor} profileId={profileId} view={query.view === "history" ? "history" : "open"} /></PortalShell>;
}
