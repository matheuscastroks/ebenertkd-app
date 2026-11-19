import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { studentDraftSchema, studentSubmissionSchema, financialReviewSchema, type StudentDraftInput } from "@/features/students/schemas";
import { canTransitionEnrollment, hasApprovedRequiredDocuments, hasRequiredSubmissionPhoto } from "@/features/students/rules";
import { getEnrollmentBundleByStudentId, getOrCreateEnrollmentBundle } from "@/features/students/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { getTrainingClass } from "@/features/classes/service";
import { createEnrollmentFeeCharge } from "@/features/billing/charge-service";
import { getBeltContext, getPolicy } from "@/features/academy/config-service";
import { isDueDayAllowed } from "@/features/academy/policy-rules";
import { issueContractForEnrollment } from "@/features/contracts/contract-service";
import { beltNameOf } from "@/features/academy/belt-rules";
import { assertSelectableRank } from "@/features/academy/rank-guard";
import { notifyAdmins, notifyStudentEvent } from "@/features/notifications/notification-service";
import {
  guardianContractPath,
  guardianEnrollmentPath,
  ROUTES,
  studentContractPath
} from "@/lib/navigation/routes";

const isoDate = (value?: string) => value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined;

export async function saveEnrollmentDraft(target: Profile, actor: Profile, input: StudentDraftInput, submit: boolean) {
  const parsed = (submit ? studentSubmissionSchema : studentDraftSchema).parse(input);
  const bundle = await getOrCreateEnrollmentBundle(target, actor);
  const isDraft = bundle.enrollment.status === "draft";
  // Depois do rascunho a graduação só muda por exame (ou pelo professor): aluno e responsável não editam a faixa.
  const keepGraduation = !isDraft && actor.role !== "admin";
  if (isDraft && submit && !hasRequiredSubmissionPhoto(bundle.documents)) throw new Error("profile_photo_required");
  if (!keepGraduation) await assertSelectableRank(parsed.rankKey, bundle.student.rank_key);
  if (parsed.requestedDueDay != null && !isDueDayAllowed(parsed.requestedDueDay, (await getPolicy("billing")).due_day_options, bundle.enrollment.requested_due_day)) throw new Error("due_day_not_allowed");
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
      rank_key: keepGraduation ? bundle.student.rank_key : parsed.rankKey,
      training_class_id: trainingClass?.$id ?? bundle.student.training_class_id,
      training_class: trainingClass?.name ?? bundle.student.training_class,
      health_condition: parsed.healthCondition,
      health_details: parsed.healthDetails,
      medications: parsed.medications,
      allergies: parsed.allergies,
      injuries: parsed.injuries,
      guardian_contact: parsed.guardianContact,
      status: isDraft ? (submit ? "submitted" : "draft") : (bundle.student.status || bundle.enrollment.status),
      updated_at: now
    }
  });

  const nextEnrollmentStatus = isDraft ? (submit ? "submitted" : "draft") : bundle.enrollment.status;
  const enrollment = await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: bundle.enrollment.$id,
    data: {
      requested_due_day: parsed.requestedDueDay ?? bundle.enrollment.requested_due_day,
      status: nextEnrollmentStatus,
      revision: bundle.enrollment.revision + 1,
      submitted_at: isDraft && submit ? now : bundle.enrollment.submitted_at,
      updated_at: now
    }
  });

  const auditAction = isDraft ? (submit ? "enrollment.submitted" : "enrollment.draft_saved") : "student.updated";
  invalidateTags(CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll, CACHE_TAGS.student(student.$id), CACHE_TAGS.studentProfile(target.$id));
  await writeAuditEvent(auditAction, actor.account_id, "enrollment", enrollment.$id, { student_id: student.$id });
  if (isDraft && submit) {
    await Promise.all([
      notifyAdmins({
        title: "Nova matrícula para análise",
        body: `${student.full_name} concluiu o cadastro.`,
        dedupeKey: `enrollment-submitted:${enrollment.$id}:${enrollment.revision}`,
        actionUrl: `/admin/matriculas/${student.$id}`
      }).catch(() => undefined),
      notifyStudentEvent({
        studentId: student.$id,
        audience: "family",
        title: "Ficha de matrícula enviada",
        body: "Recebemos seus dados! O professor vai analisar sua matrícula e você será avisado assim que avançar.",
        dedupeKey: `enrollment-received:${enrollment.$id}:${enrollment.revision}`,
        studentActionUrl: ROUTES.studentEnrollment,
        guardianActionUrl: guardianEnrollmentPath,
        actorAccountId: actor.account_id
      }).catch(() => undefined)
    ]);
  }
  return getEnrollmentBundleByStudentId(student.$id);
}

export async function adminUpdateStudent(actor: Profile, studentId: string, input: StudentDraftInput) {
  if (!actor.capabilities.includes("admin")) throw new Error("unauthorized");
  const parsed = studentDraftSchema.parse(input);
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  await assertSelectableRank(parsed.rankKey, bundle.student.rank_key);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  const trainingClass = parsed.trainingClassId ? await getTrainingClass(parsed.trainingClassId) : null;
  if (trainingClass && trainingClass.status !== "active" && trainingClass.$id !== bundle.student.training_class_id) {
    throw new Error("training_class_inactive");
  }

  if (parsed.cpf) {
    const duplicates = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.students,
      queries: [Query.equal("cpf", [parsed.cpf]), Query.notEqual("$id", [bundle.student.$id]), Query.limit(1)]
    });
    if (duplicates?.rows[0]) throw new Error("cpf_already_exists");
  }

  const updatedStudent = await tables.updateRow({
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
      rank_key: parsed.rankKey ?? bundle.student.rank_key,
      training_class_id: trainingClass?.$id ?? bundle.student.training_class_id,
      training_class: trainingClass?.name ?? bundle.student.training_class,
      health_condition: parsed.healthCondition,
      health_details: parsed.healthDetails,
      medications: parsed.medications,
      allergies: parsed.allergies,
      injuries: parsed.injuries,
      guardian_contact: parsed.guardianContact,
      updated_at: now
    }
  });

  await recordReview(actor, studentId, bundle.enrollment.$id, "student_updated", "Dados cadastrais atualizados pelo professor", input);
  invalidateTags(CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll, CACHE_TAGS.student(studentId), CACHE_TAGS.studentProfile(bundle.student.profile_id));
  await writeAuditEvent("student.updated_by_admin", actor.account_id, "student", studentId, { changes: input });
  const classChanged = trainingClass && trainingClass.$id !== bundle.student.training_class_id;
  const beltChanged = parsed.rankKey != null && parsed.rankKey !== bundle.student.rank_key;
  const updateSummary = classChanged
    ? `O professor atualizou sua ficha e definiu sua turma como ${trainingClass.name}.`
    : beltChanged
      ? `O professor atualizou sua graduação na ficha para Faixa ${beltNameOf((await getBeltContext()).ranks, updatedStudent.rank_key, "atualizada")}.`
      : "O professor atualizou informações da sua ficha de matrícula.";
  await notifyStudentEvent({
    studentId,
    audience: "family",
    title: "Sua ficha de matrícula foi atualizada",
    body: updateSummary,
    dedupeKey: `student-updated-by-admin:${studentId}:${now}`,
    studentActionUrl: ROUTES.studentEnrollment,
    guardianActionUrl: guardianEnrollmentPath,
    actorAccountId: actor.account_id
  }).catch(() => undefined);
  return updatedStudent;
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
  if (!isDueDayAllowed(input.approvedDueDay, (await getPolicy("billing")).due_day_options, bundle.enrollment.approved_due_day)) throw new Error("due_day_not_allowed");
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
  invalidateTags(CACHE_TAGS.enrollments, CACHE_TAGS.student(studentId));
}

export async function advanceToSignature(actor: Profile, studentId: string) {
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  const input = {
    fullName: bundle.student.full_name, cpf: bundle.student.cpf ?? "", birthDate: bundle.student.birth_date?.slice(0, 10) ?? "",
    whatsapp: bundle.student.whatsapp ?? "", address: bundle.student.address ?? "", emergencyContactName: bundle.student.emergency_contact_name ?? "",
    emergencyContactRelationship: bundle.student.emergency_contact_relationship ?? "", emergencyContactPhone: bundle.student.emergency_contact_phone ?? "",
    startedAtTkd: bundle.student.started_at_tkd?.slice(0, 10) ?? "", rankKey: bundle.student.rank_key ?? "", trainingClassId: bundle.student.training_class_id ?? undefined,
    healthCondition: bundle.student.health_condition, healthDetails: bundle.student.health_details ?? undefined, medications: bundle.student.medications ?? undefined,
    allergies: bundle.student.allergies ?? undefined, injuries: bundle.student.injuries ?? undefined, guardianContact: bundle.student.guardian_contact ?? undefined,
    requestedDueDay: bundle.enrollment.requested_due_day
  };
  if (!studentSubmissionSchema.safeParse(input).success) throw new Error("incomplete_student_record");
  if (!hasApprovedRequiredDocuments(bundle.documents)) throw new Error("documents_not_approved");
  if (bundle.enrollment.monthly_fee_cents == null || bundle.enrollment.approved_due_day == null || !bundle.enrollment.first_due_date || !bundle.enrollment.contract_start || !bundle.enrollment.contract_end) throw new Error("financial_review_incomplete");
  if (!canTransitionEnrollment(bundle.enrollment.status, "awaiting_signature")) throw new Error("invalid_enrollment_transition");
  const contract = await issueContractForEnrollment(actor, studentId);
  if (bundle.enrollment.status === "awaiting_signature") return contract;
  await createEnrollmentFeeCharge(bundle.enrollment);
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: bundle.enrollment.$id, data: { status: "awaiting_signature", revision: bundle.enrollment.revision + 1, updated_at: new Date().toISOString() } });
  await recordReview(actor, studentId, bundle.enrollment.$id, "awaiting_signature");
  invalidateTags(CACHE_TAGS.enrollments, CACHE_TAGS.student(studentId), CACHE_TAGS.contracts);
  await notifyStudentEvent({
    studentId,
    audience: "family",
    title: "Matrícula aprovada! Contrato pronto para assinar",
    body: "O professor aprovou sua ficha e liberou o contrato. Leia e assine pelo aplicativo para ativar sua matrícula.",
    minorTitle: "Sua matrícula avançou!",
    minorBody: "O professor aprovou sua ficha e enviou o contrato para o seu responsável assinar.",
    dedupeKey: `enrollment-awaiting-signature:${contract.$id}`,
    studentActionUrl: studentContractPath(contract.$id),
    guardianActionUrl: (profileId) => guardianContractPath(profileId, contract.$id),
    actorAccountId: actor.account_id
  }).catch(() => undefined);
  return contract;
}
