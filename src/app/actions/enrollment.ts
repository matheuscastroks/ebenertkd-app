"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveStudentProfile } from "@/features/students/access";
import { uploadStudentDocument } from "@/features/students/document-service";
import { saveEnrollmentDraft } from "@/features/students/enrollment-service";
import { requireProfile } from "@/lib/auth/session";
import type { BeltOption } from "@/features/students/options";

function enrollmentInput(formData: FormData) {
  const value = (key: string) => String(formData.get(key) ?? "");
  return {
    fullName: value("full_name"),
    cpf: value("cpf"),
    birthDate: value("birth_date"),
    whatsapp: value("whatsapp"),
    address: value("address") || undefined,
    emergencyContactName: value("emergency_contact_name"),
    emergencyContactRelationship: value("emergency_contact_relationship"),
    emergencyContactPhone: value("emergency_contact_phone"),
    startedAtTkd: value("started_at_tkd"),
    currentBelt: (value("current_belt") || undefined) as BeltOption | undefined,
    trainingClassId: value("training_class_id"),
    gub: value("gub") ? Number(value("gub")) : undefined,
    healthCondition: (value("health_condition") || undefined) as "yes" | "no" | undefined,
    healthDetails: value("health_details") || undefined,
    medications: value("medications") || undefined,
    allergies: value("allergies") || undefined,
    injuries: value("injuries") || undefined,
    guardianContact: value("guardian_contact"),
    requestedDueDay: value("requested_due_day") ? Number(value("requested_due_day")) : undefined
  };
}

async function persistEnrollment(formData: FormData, submit: boolean) {
  const actor = await requireProfile();
  const profileId = String(formData.get("target_profile_id") ?? "");
  const target = await resolveStudentProfile(actor, profileId);
  const draft = await saveEnrollmentDraft(target, actor, enrollmentInput(formData), false);
  const uploads = [
    ["profile_photo", formData.get("profile_photo")],
    ["medical_certificate", formData.get("medical_certificate")]
  ] as const;
  for (const [type, value] of uploads) {
    if (value instanceof File && value.size > 0) {
      await uploadStudentDocument(actor, target, draft.student.$id, type, value);
    }
  }
  if (submit) await saveEnrollmentDraft(target, actor, enrollmentInput(formData), true);
  revalidatePath("/matricula");
  return profileId;
}

export async function saveEnrollmentDraftAction(formData: FormData) {
  let profileId = String(formData.get("target_profile_id") ?? "");
  try {
    profileId = await persistEnrollment(formData, false);
  } catch {
    redirect(`/matricula?profile=${encodeURIComponent(profileId)}&error=save`);
  }
  redirect(`/matricula?profile=${encodeURIComponent(profileId)}&saved=1`);
}

export async function submitEnrollmentAction(formData: FormData) {
  let profileId = String(formData.get("target_profile_id") ?? "");
  try {
    profileId = await persistEnrollment(formData, true);
  } catch {
    redirect(`/matricula?profile=${encodeURIComponent(profileId)}&error=submit`);
  }
  redirect(`/matricula?profile=${encodeURIComponent(profileId)}&submitted=1`);
}
