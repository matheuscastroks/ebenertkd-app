"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adjustCharge } from "@/features/billing/charge-service";
import { decidePaymentProof, recordManualPayment, reversePayment } from "@/features/billing/payment-service";
import { uploadPaymentProof } from "@/features/billing/proof-service";
import { saveBillingSettings } from "@/features/billing/settings-service";
import { requireProfile } from "@/lib/auth/session";
import { guardianBillingPath, ROUTES } from "@/lib/navigation/routes";
import { reaisToCents } from "@/lib/money";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function saveBillingSettingsAction(formData: FormData) {
  const actor = await requireProfile("admin");
  try { await saveBillingSettings(actor, { pixKey: formData.get("pix_key"), pixKeyType: formData.get("pix_key_type"), beneficiaryName: formData.get("beneficiary_name"), instructions: formData.get("instructions") || undefined }); }
  catch { return { ok: false as const }; }
  revalidatePath(ROUTES.adminBilling);
  return { ok: true as const };
}

export async function uploadPaymentProofAction(formData: FormData) {
  const actor = await requireProfile();
  const profileId = String(formData.get("profile_id") ?? "");
  const returnPath = profileId ? guardianBillingPath(profileId) : ROUTES.studentBilling;
  try {
    const file = formData.get("proof");
    if (!(file instanceof File)) throw new Error("proof_required");
    await uploadPaymentProof(actor, String(formData.get("charge_id") ?? ""), file);
  } catch { redirect(`${returnPath}?error=proof`); }
  revalidatePath(returnPath); revalidatePath(ROUTES.adminBilling); redirect(`${returnPath}?updated=proof`);
}

export async function decidePaymentProofAction(formData: FormData) {
  const actor = await requireProfile("admin");
  try { await decidePaymentProof(actor, { proofId: formData.get("proof_id"), decision: formData.get("decision"), reason: formData.get("reason") || undefined, paidAt: formData.get("paid_at") || undefined }); }
  catch { redirect(`${ROUTES.adminBilling}?error=review`); }
  updateTag(CACHE_TAGS.billingCharges); revalidatePath(ROUTES.adminBilling); redirect(`${ROUTES.adminBilling}?updated=review`);
}

export async function recordManualPaymentAction(formData: FormData) {
  const actor = await requireProfile("admin");
  try { await recordManualPayment(actor, { chargeId: formData.get("charge_id"), amountCents: reaisToCents(formData.get("amount_reais")), paidAt: formData.get("paid_at"), notes: formData.get("notes") }); }
  catch { redirect(`${ROUTES.adminBilling}?error=payment`); }
  updateTag(CACHE_TAGS.billingCharges); revalidatePath(ROUTES.adminBilling); redirect(`${ROUTES.adminBilling}?updated=payment`);
}

export async function reversePaymentAction(formData: FormData) {
  const actor = await requireProfile("admin");
  try { await reversePayment(actor, { paymentId: formData.get("payment_id"), reason: formData.get("reason") }); }
  catch { redirect(`${ROUTES.adminBilling}?error=reversal`); }
  updateTag(CACHE_TAGS.billingCharges); revalidatePath(ROUTES.adminBilling); redirect(`${ROUTES.adminBilling}?updated=reversal`);
}

export async function adjustChargeAction(formData: FormData) {
  const actor = await requireProfile("admin");
  try { await adjustCharge(actor, { chargeId: formData.get("charge_id"), amountCents: reaisToCents(formData.get("amount_reais")), dueDate: formData.get("due_date"), reason: formData.get("reason") }); }
  catch { redirect(`${ROUTES.adminBilling}?error=adjustment`); }
  updateTag(CACHE_TAGS.billingCharges); revalidatePath(ROUTES.adminBilling); redirect(`${ROUTES.adminBilling}?updated=adjustment`);
}
