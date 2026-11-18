"use server";

import { redirect } from "next/navigation";
import { quickRenewContract, renewContract } from "@/features/contracts/renewal-service";
import { requireProfile } from "@/lib/auth/session";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

export async function renewContractAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  const destination = adminEnrollmentPath(studentId);
  try {
    await renewContract(admin, { studentId, endsAt: formData.get("ends_at") });
  } catch {
    redirect(`${destination}?error=renewal`);
  }
  redirect(`${destination}?updated=renewal`);
}

export async function quickRenewContractAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  try {
    await quickRenewContract(admin, { studentId, endsAt: formData.get("ends_at") });
  } catch {
    redirect(`${ROUTES.adminContractRenewals}?error=renewal`);
  }
  redirect(`${ROUTES.adminContractRenewals}?updated=renewal`);
}
