"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reviewStudentDocument } from "@/features/students/document-service";
import { advanceToSignature, saveFinancialReview } from "@/features/students/enrollment-service";
import { requireProfile } from "@/lib/auth/session";
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
      monthlyFeeCents: formData.get("monthly_fee_cents"),
      discountCents: formData.get("discount_cents") || 0,
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
