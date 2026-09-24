import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { studentDraftSchema, studentSubmissionSchema, financialReviewSchema, type StudentDraftInput } from "@/features/students/schemas";
import { canTransitionEnrollment, hasApprovedRequiredDocuments } from "@/features/students/rules";
import { getEnrollmentBundleByStudentId, getOrCreateEnrollmentBundle } from "@/features/students/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { getTrainingClass } from "@/features/classes/service";

const isoDate = (value?: string) => value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;

export async function saveEnrollmentDraft(target: Profile, actor: Profile, input: StudentDraftInput, submit: boolean) {
  const parsed = (submit ? studentSubmissionSchema : studentDraftSchema).parse(input);
  const bundle = await getOrCreateEnrollmentBundle(target, actor);
  if (bundle.enrollment.status !== "draft") throw new Error("enrollment_locked");
  const trainingClass = parsed.trainingClassId ? await getTrainingClass(parsed.trainingClassId) : null;
  if (trainingClass && trainingClass.status !== "active") throw new Error("training_class_inactive");
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  const duplicates = parsed.cpf ? await tables.listRows({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("cpf", [parsed.cpf]), Query.notEqual("$id", [bundle.student.$id]), Query.limit(1)]
  }) : null;
  if (duplicates?.rows[0]) throw new Error("cpf_already_exists");

  const student = await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    rowId: bundle.student.$id,
    data: {
      full_name: parsed.fullName,
      cpf: parsed.cpf,
      birth_date: isoDate(parsed.birthDate),
      whatsapp: parsed.whatsapp,
      address: parsed.address,
      emergency_contact_name: parsed.emergencyContactName,
      emergency_contact_relationship: parsed.emergencyContactRelationship,
      emergency_contact_phone: parsed.emergencyContactPhone,
      started_at_tkd: isoDate(parsed.startedAtTkd),
      current_belt: parsed.currentBelt,
      training_class_id: trainingClass?.$id,
      training_class: trainingClass?.name,
      gub: parsed.gub,
      health_condition: parsed.healthCondition,
      health_details: parsed.healthDetails,
      medications: parsed.medications,
      allergies: parsed.allergies,
      injuries: parsed.injuries,
      guardian_contact: parsed.guardianContact,
      status: submit ? "submitted" : "draft",
      updated_at: now
    }
  });
  const enrollment = await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: bundle.enrollment.$id,
    data: {
      requested_due_day: parsed.requestedDueDay,
      status: submit ? "submitted" : "draft",
      revision: bundle.enrollment.revision + 1,
      submitted_at: submit ? now : bundle.enrollment.submitted_at,
      updated_at: now
    }
  });
  await writeAuditEvent(submit ? "enrollment.submitted" : "enrollment.draft_saved", actor.account_id, "enrollment", enrollment.$id, { student_id: student.$id });
  return getEnrollmentBundleByStudentId(student.$id);
}

export async function recordReview(actor: Profile, studentId: string, enrollmentId: string, action: string, notes?: string, snapshot?: unknown) {
  const { tables, config } = createAppwriteAdminClient();
  await tables.createRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollmentReviews,
    rowId: ID.unique(),
    data: { enrollment_id: enrollmentId, student_id: studentId, actor_account_id: actor.account_id, action, notes, snapshot: snapshot ? JSON.stringify(snapshot) : undefined, created_at: new Date().toISOString() },
    permissions: []
  });
  await writeAuditEvent(`enrollment.review.${action}`, actor.account_id, "enrollment", enrollmentId, { student_id: studentId });
}

export async function saveFinancialReview(actor: Profile, studentId: string, raw: unknown) {
  const input = financialReviewSchema.parse(raw);
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  if (!["submitted", "under_review"].includes(bundle.enrollment.status)) throw new Error("enrollment_not_reviewable");
  const { tables, config } = createAppwriteAdminClient();
  const status = bundle.enrollment.status === "submitted" ? "under_review" : bundle.enrollment.status;
  const enrollment = await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: bundle.enrollment.$id,
    data: {
      monthly_fee_cents: input.monthlyFeeCents,
      discount_cents: input.discountCents,
      approved_due_day: input.approvedDueDay,
      first_due_date: isoDate(input.firstDueDate),
      contract_start: isoDate(input.contractStart),
      contract_end: isoDate(input.contractEnd),
      status,
      revision: bundle.enrollment.revision + 1,
      updated_at: new Date().toISOString()
    }
  });
  await recordReview(actor, studentId, enrollment.$id, "financial_updated", undefined, input);
}

export async function advanceToSignature(actor: Profile, studentId: string) {
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  const input = {
    fullName: bundle.student.full_name, cpf: bundle.student.cpf ?? "", birthDate: bundle.student.birth_date?.slice(0, 10) ?? "",
    whatsapp: bundle.student.whatsapp ?? "", address: bundle.student.address ?? "", emergencyContactName: bundle.student.emergency_contact_name ?? "",
    emergencyContactRelationship: bundle.student.emergency_contact_relationship ?? "", emergencyContactPhone: bundle.student.emergency_contact_phone ?? "",
    startedAtTkd: bundle.student.started_at_tkd?.slice(0, 10) ?? "", currentBelt: bundle.student.current_belt ?? "", trainingClassId: bundle.student.training_class_id ?? undefined, gub: bundle.student.gub,
    healthCondition: bundle.student.health_condition, healthDetails: bundle.student.health_details ?? undefined, medications: bundle.student.medications ?? undefined,
    allergies: bundle.student.allergies ?? undefined, injuries: bundle.student.injuries ?? undefined, guardianContact: bundle.student.guardian_contact ?? undefined,
    requestedDueDay: bundle.enrollment.requested_due_day
  };
  if (!studentSubmissionSchema.safeParse(input).success) throw new Error("incomplete_student_record");
  if (!hasApprovedRequiredDocuments(bundle.documents)) throw new Error("documents_not_approved");
  if (bundle.enrollment.monthly_fee_cents == null || bundle.enrollment.approved_due_day == null || !bundle.enrollment.first_due_date || !bundle.enrollment.contract_start || !bundle.enrollment.contract_end) throw new Error("financial_review_incomplete");
  if (!canTransitionEnrollment(bundle.enrollment.status, "awaiting_signature")) throw new Error("invalid_enrollment_transition");
  if (bundle.enrollment.status === "awaiting_signature") return;
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: bundle.enrollment.$id, data: { status: "awaiting_signature", revision: bundle.enrollment.revision + 1, updated_at: new Date().toISOString() } });
  await recordReview(actor, studentId, bundle.enrollment.$id, "awaiting_signature");
}
