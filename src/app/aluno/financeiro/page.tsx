import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentBillingPage({ searchParams }: { searchParams: Promise<{ view?: string; updated?: string; error?: string }> }) {
  const profile = await requireProfile();
  const query = await searchParams;
  if (profile.role === "minor_student") redirect(ROUTES.student);
  return <PortalShell profile={profile} activePath={ROUTES.studentBilling} title="Financeiro" subtitle="Consulte mensalidades e envie seus comprovantes.">{query.updated ? <OperationToast tone="success" title="Comprovante enviado" description="O pagamento foi encaminhado para análise." clearParams={["updated"]} /> : null}{query.error ? <OperationToast tone="error" title="Não foi possível enviar o comprovante" description="Confira o arquivo e tente novamente." clearParams={["error"]} /> : null}<PayerBilling actor={profile} view={query.view === "history" ? "history" : "open"} /></PortalShell>;
}
