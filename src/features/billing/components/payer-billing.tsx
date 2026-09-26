import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { PayerBillingView } from "@/features/billing/components/payer-billing-view";
import { listLatestProofsForCharges } from "@/features/billing/proof-service";
import { getBillingSettings } from "@/features/billing/settings-service";
import { toClientData } from "@/lib/client-data";

export async function PayerBilling({ actor, profileId, view = "open" }: { actor: Profile; profileId?: string; view?: "open" | "history" }) {
  const [charges, settings] = await Promise.all([listChargesForStudent(actor, profileId), getBillingSettings()]);
  const proofs = await listLatestProofsForCharges(charges.map((charge) => charge.$id));
  return <PayerBillingView charges={toClientData(charges)} settings={toClientData(settings)} proofs={toClientData(Object.fromEntries(proofs))} profileId={profileId} initialView={view === "history" ? "paid" : "open"} />;
}
