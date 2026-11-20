"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PARQ_QUESTIONS } from "@/features/students/parq-rules";
import { submitParq } from "@/features/students/parq-service";
import { requireProfile } from "@/lib/auth/session";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { guardianParqPath, ROUTES } from "@/lib/navigation/routes";

export async function submitParqAction(formData: FormData) {
  const actor = await requireProfile();
  const profileId = String(formData.get("profile_id") ?? "").trim() || null;
  const destination =
    profileId && profileId !== actor.$id ? guardianParqPath(profileId) : ROUTES.studentParq;

  const answers: Record<string, string> = {};
  for (const question of PARQ_QUESTIONS) {
    answers[question.id] = String(formData.get(question.id) ?? "");
  }

  const termAccepted = formData.get("term_accepted") === "on" || formData.get("term_accepted") === "true";
  const signatureDataUrl = String(formData.get("signature_data_url") ?? "");
  const signerName = String(formData.get("signer_name") ?? "").trim() || null;
  const requestHeaders = await headers();

  try {
    const submission = await submitParq(
      actor,
      {
        profileId,
        answers,
        termAccepted,
        signatureDataUrl,
        signerName,
      },
      { ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() }
    );
    updateTag(CACHE_TAGS.parq(submission.student_id));
    updateTag(CACHE_TAGS.parqAll);
    updateTag(CACHE_TAGS.enrollments);
    revalidatePath(destination);
    revalidatePath(ROUTES.studentCard);
    revalidatePath(ROUTES.adminCompliance);
  } catch {
    redirect(`${destination}?error=parq`);
  }

  redirect(`${destination}?submitted=1`);
}
