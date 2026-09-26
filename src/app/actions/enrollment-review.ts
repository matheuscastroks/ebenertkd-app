"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reviewStudentDocument } from "@/features/students/document-service";
import { advanceToSignature, adminUpdateStudent, saveFinancialReview } from "@/features/students/enrollment-service";
import type { BeltOption } from "@/features/students/options";
import { requireProfile } from "@/lib/auth/session";
import { reaisToCents } from "@/lib/money";
import { adminEnrollmentPath } from "@/lib/navigation/routes";

const reviewPath = (studentId: string, query = "") => `${adminEnrollmentPath(studentId)}${query}`;

export async function reviewDocumentAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  try {
    const decision = String(formData.get("decision"));
    if (decision !== "approved" && decision !== "rejected") throw new Error("invalid_decision");
    await reviewStudentDocument(admin, String(formData.get("document_id") ?? ""), decision, String(formData.get("reason") ?? ""));
  } catch {
    redirect(reviewPath(studentId, "?error=document"));
  }
  revalidatePath(reviewPath(studentId));
  redirect(reviewPath(studentId, "?updated=document"));
}

export async function saveFinancialReviewAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  try {
    await saveFinancialReview(admin, studentId, {
      monthlyFeeCents: reaisToCents(formData.get("monthly_fee_reais")),
      discountCents: reaisToCents(formData.get("discount_reais") || 0),
      approvedDueDay: formData.get("approved_due_day"),
      firstDueDate: formData.get("first_due_date"),
      contractStart: formData.get("contract_start"),
      contractEnd: formData.get("contract_end")
    });
  } catch {
    redirect(reviewPath(studentId, "?error=financial"));
  }
  revalidatePath(reviewPath(studentId));
  redirect(reviewPath(studentId, "?updated=financial"));
}

export async function advanceToSignatureAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  try {
    await advanceToSignature(admin, studentId);
  } catch {
    redirect(reviewPath(studentId, "?error=advance"));
  }
  revalidatePath(reviewPath(studentId));
  redirect(reviewPath(studentId, "?updated=signature"));
}

import { formatAddress } from "@/lib/address";

function extractAddress(formData: FormData): string | undefined {
  const address = String(formData.get("address") ?? "").trim();
  if (address) return address;

  const street = String(formData.get("address_street") ?? "").trim();
  const number = String(formData.get("address_number") ?? "").trim();
  const complement = String(formData.get("address_complement") ?? "").trim();
  const neighborhood = String(formData.get("address_neighborhood") ?? "").trim();
  const city = String(formData.get("address_city") ?? "").trim();
  const state = String(formData.get("address_state") ?? "").trim();
  const cep = String(formData.get("address_cep") ?? "").trim();

  if (street || number || city || cep) {
    return formatAddress({ street, number, complement, neighborhood, city, state, cep }) || undefined;
  }
  return undefined;
}

export async function adminUpdateStudentAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const studentId = String(formData.get("student_id") ?? "");
  try {
    await adminUpdateStudent(admin, studentId, {
      fullName: String(formData.get("full_name") ?? ""),
      cpf: String(formData.get("cpf") ?? "") || undefined,
      birthDate: String(formData.get("birth_date") ?? "") || undefined,
      whatsapp: String(formData.get("whatsapp") ?? "") || undefined,
      address: extractAddress(formData),
      emergencyContactName: String(formData.get("emergency_contact_name") ?? "") || undefined,
      emergencyContactRelationship: String(formData.get("emergency_contact_relationship") ?? "") || undefined,
      emergencyContactPhone: String(formData.get("emergency_contact_phone") ?? "") || undefined,
      startedAtTkd: String(formData.get("started_at_tkd") ?? "") || undefined,
      currentBelt: (String(formData.get("current_belt") ?? "") || undefined) as BeltOption | undefined,
      gub: formData.get("gub") ? Number(formData.get("gub")) : undefined,
      trainingClassId: String(formData.get("training_class_id") ?? "") || undefined,
      healthCondition: (String(formData.get("health_condition") ?? "") || undefined) as "yes" | "no" | undefined,
      healthDetails: String(formData.get("health_details") ?? "") || undefined,
      medications: String(formData.get("medications") ?? "") || undefined,
      allergies: String(formData.get("allergies") ?? "") || undefined,
      injuries: String(formData.get("injuries") ?? "") || undefined,
      guardianContact: String(formData.get("guardian_contact") ?? "") || undefined
    });
  } catch {
    redirect(reviewPath(studentId, "?error=update_student"));
  }
  revalidatePath(reviewPath(studentId));
  redirect(reviewPath(studentId, "?updated=student"));
}
