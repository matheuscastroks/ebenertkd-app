"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { decideCancellation, requestCancellation } from "@/features/contracts/cancellation-service";
import { getContractForActor } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { guardianContractPath, ROUTES, studentContractPath } from "@/lib/navigation/routes";
import { reaisToCents } from "@/lib/money";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function requestCancellationAction(formData: FormData) {
  const actor = await requireProfile();
  const contractId = String(formData.get("contract_id") ?? "");
  const { bundle } = await getContractForActor(actor, contractId);
  const destination = actor.$id === bundle.student.profile_id ? studentContractPath(contractId) : guardianContractPath(bundle.student.profile_id, contractId);
  try {
    await requestCancellation(actor, { contractId, targetExitMonth: formData.get("target_exit_month"), reason: formData.get("reason") || undefined });
  } catch {
    redirect(`${destination}?error=cancellation`);
  }
  redirect(`${destination}?requested=1`);
}

export async function decideCancellationAction(formData: FormData) {
  const admin = await requireProfile("admin");
  try {
    await decideCancellation(admin, { requestId: formData.get("request_id"), decision: formData.get("decision"), feeCents: reaisToCents(formData.get("fee_reais") || 0), notes: formData.get("notes") });
  } catch {
    redirect(`${ROUTES.adminCancellations}?error=decision`);
  }
  updateTag(CACHE_TAGS.cancellations);
  revalidatePath(ROUTES.adminCancellations);
  redirect(`${ROUTES.adminCancellations}?updated=1`);
}
