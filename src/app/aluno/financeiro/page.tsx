import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { PayerBilling } from "@/features/billing/components/payer-billing";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentBillingPage() {
  const profile = await requireProfile();
  if (profile.role === "minor_student") redirect(ROUTES.student);
  return <PortalShell profile={profile} activePath={ROUTES.studentBilling} title="Financeiro" subtitle="Consulte mensalidades e envie seus comprovantes."><PayerBilling actor={profile} /></PortalShell>;
}
