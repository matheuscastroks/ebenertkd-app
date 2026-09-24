"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { minorRegistrationSchema } from "@/features/auth/schemas";
import { createMinorAccount } from "@/features/auth/service";
import { enableGuardianCapability, resetMinorPassword, revokeMinorSessions } from "@/features/families/service";
import { requireCapability, requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export async function enableGuardianAction() {
  const profile = await requireProfile();
  await enableGuardianCapability(profile);
  redirect(ROUTES.guardianDependents);
}

export async function createMinorAction(formData: FormData) {
  const guardian = await requireCapability("guardian");
  const parsed = minorRegistrationSchema.safeParse({
    fullName: formData.get("full_name"), username: formData.get("username"), password: formData.get("password")
  });
  if (!parsed.success) redirect(`${ROUTES.guardianDependents}?error=invalid_minor`);
  try {
    await createMinorAccount(guardian, parsed.data);
  } catch {
    redirect(`${ROUTES.guardianDependents}?error=create_minor`);
  }
  redirect(`${ROUTES.guardianDependents}?created=1`);
}

export async function resetMinorPasswordAction(formData: FormData) {
  const guardian = await requireCapability("guardian");
  const minorProfileId = String(formData.get("minor_profile_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!minorProfileId || password.length < 8) redirect(`${ROUTES.guardianDependents}?error=password`);
  await resetMinorPassword(guardian, minorProfileId, password);
  revalidatePath(ROUTES.guardianDependents);
}

export async function revokeMinorSessionsAction(formData: FormData) {
  const guardian = await requireCapability("guardian");
  const minorProfileId = String(formData.get("minor_profile_id") ?? "");
  if (!minorProfileId) redirect(`${ROUTES.guardianDependents}?error=minor`);
  await revokeMinorSessions(guardian, minorProfileId);
  revalidatePath(ROUTES.guardianDependents);
}
