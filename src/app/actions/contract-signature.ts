"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getContractForActor } from "@/features/contracts/contract-service";
import { signContract } from "@/features/contracts/signature-service";
import { requireProfile } from "@/lib/auth/session";
import { guardianContractPath, studentContractPath } from "@/lib/navigation/routes";

export async function signContractAction(formData: FormData) {
  const actor = await requireProfile();
  const contractId = String(formData.get("contract_id") ?? "");
  const requestHeaders = await headers();
  const { bundle } = await getContractForActor(actor, contractId);
  const destination = actor.$id === bundle.student.profile_id
    ? studentContractPath(contractId)
    : guardianContractPath(bundle.student.profile_id, contractId);
  try {
    await signContract(actor, { contractId, accepted: formData.get("accepted"), readConfirmed: formData.get("read_confirmed"), signatureDataUrl: formData.get("signature_data_url") }, { ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: requestHeaders.get("user-agent") });
  } catch {
    redirect(`${destination}?error=signature`);
  }
  redirect(`${destination}?signed=1`);
}
