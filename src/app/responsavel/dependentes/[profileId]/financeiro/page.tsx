import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianBillingPage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ view?: string; updated?: string; error?: string }> }) {
  const actor = await requireCapability("guardian");
  const [{ profileId }, query] = await Promise.all([params, searchParams]);
  return <PortalShell profile={actor} activePath={ROUTES.guardianDependents} title="Financeiro do dependente" subtitle="Acompanhe cobranças e envie comprovantes em nome do aluno." breadcrumbs={[{ label: "Dependentes", href: ROUTES.guardianDependents }, { label: "Financeiro" }]}>{query.updated ? <OperationToast tone="success" title="Comprovante enviado" description="O pagamento foi encaminhado para análise." clearParams={["updated"]} /> : null}{query.error ? <OperationToast tone="error" title="Não foi possível enviar o comprovante" description="Confira o arquivo e tente novamente." clearParams={["error"]} /> : null}<PayerBilling actor={actor} profileId={profileId} view={query.view === "history" ? "history" : "open"} /></PortalShell>;
}
