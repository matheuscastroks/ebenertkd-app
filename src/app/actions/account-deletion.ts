"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { deleteSelfAccount, deleteStudentAccount } from "@/features/auth/account-deletion-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { CACHE_TAGS } from "@/lib/cache/tags";

/**
 * Action to delete the currently logged‑in user's own account.
 * Requires the user to be authenticated as a non‑admin profile.
 */
export async function deleteSelfAccountAction(formData: FormData) {
  const profile = await requireProfile(); // any logged‑in user
  // Guard against admin self‑deletion – service will also reject, but we provide early feedback.
  if (profile.role === "admin") {
    redirect("/configuracoes?error=admin_self_delete");
    return;
  }
  try {
    await deleteSelfAccount(profile);
    // Invalidate any protected routes that depend on the profile.
    revalidatePath("/configuracoes");
    // Clear the session cookie (handled by the auth lib on next request) by redirecting to home.
    redirect("/?deleted=1");
  } catch (e) {
    // On any failure fall back to an error flag.
    redirect("/configuracoes?error=delete_self");
  }
}

/**
 * Admin action to delete a student profile.
 * Expects a hidden input named `target_profile_id` containing the student's profile id.
 */
export async function deleteStudentAccountAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const targetId = String(formData.get("target_profile_id") ?? "");
  if (!targetId) {
    redirect(`${ROUTES.adminStudentAccess}?error=missing_target`);
    return;
  }
  try {
    await deleteStudentAccount(admin, targetId);
    // Invalidate the student‑access list page.
    updateTag(CACHE_TAGS.studentAccess);
    updateTag(CACHE_TAGS.enrollments);
    revalidatePath(ROUTES.adminStudentAccess);
    redirect(`${ROUTES.adminStudentAccess}?deleted=1`);
  } catch (e) {
    redirect(`${ROUTES.adminStudentAccess}?error=delete_student`);
  }
}
