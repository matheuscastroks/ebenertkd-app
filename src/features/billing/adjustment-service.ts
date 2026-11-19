import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { buildGenericNotice } from "@/features/billing/adjustment-message";
import { pickPayerPhone } from "@/features/billing/adjustment-payer";
import { netFeeCents, type AdjustmentMode } from "@/features/billing/adjustment-rules";
import { adjustmentIdSchema, adjustmentInputSchema, markNotifiedSchema } from "@/features/billing/planning-schemas";
import type { TuitionAdjustment, TuitionAdjustmentItem } from "@/features/billing/types";
import { listTrainingClasses } from "@/features/classes/service";
import { publishAnnouncement } from "@/features/notifications/notification-service";
import type { Enrollment, Student } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { formatBusinessDateBr, whatsappLink } from "@/lib/dates";

const ELIGIBLE_STATUSES = new Set(["active", "awaiting_renewal"]);
const CHUNK = 10;

function requireAdmin(actor: Profile) {
  if (actor.role !== "admin") throw new Error("admin_required");
}

/** Id estável por campanha + matrícula: garante um único item por par, mesmo com cliques repetidos. */
export function adjustmentItemRowId(adjustmentId: string, enrollmentId: string) {
  return createHash("sha256").update(`${adjustmentId}:${enrollmentId}`).digest("hex").slice(0, 36);
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function mapInChunks<T, R>(values: T[], work: (value: T) => Promise<R>) {
  const results: R[] = [];
  for (const group of chunks(values, CHUNK)) results.push(...(await Promise.all(group.map(work))));
  return results;
}

async function rowsByIds<Row extends import("node-appwrite").Models.Row>(tableId: string, ids: string[]) {
  const { tables, config } = createAppwriteAdminClient();
  const rows: Row[] = [];
  for (const group of chunks([...new Set(ids)], 100)) {
    const result = await tables.listRows<Row>({ databaseId: config.databaseId, tableId, queries: [Query.equal("$id", group), Query.limit(100)] });
    rows.push(...result.rows);
  }
  return rows;
}

export type AdjustmentCandidate = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string;
  currentFeeCents: number;
  discountCents: number;
  contractEnd: string | null;
};

/** Alunos que podem receber reajuste (matrícula ativa ou aguardando renovação, com mensalidade definida). */
export async function listAdjustmentCandidates(): Promise<AdjustmentCandidate[]> {
  const [dataset, classes] = await Promise.all([
    cachedRead(
      { name: "adjustment-candidates", key: [], tags: [CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll], revalidate: 60 },
      async () => {
        const [enrollments, students] = await Promise.all([
          listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
          listAllRows<Student>(APPWRITE_IDS.tables.students)
        ]);
        return { enrollments, students };
      }
    ),
    listTrainingClasses(true)
  ]);
  const studentById = new Map(dataset.students.map((student) => [student.$id, student]));
  const classById = new Map(classes.map((trainingClass) => [trainingClass.$id, trainingClass.name]));
  return dataset.enrollments
    .filter((enrollment) => ELIGIBLE_STATUSES.has(enrollment.status) && (enrollment.monthly_fee_cents ?? 0) > 0 && studentById.has(enrollment.student_id))
    .map((enrollment) => {
      const student = studentById.get(enrollment.student_id) as Student;
      return {
        enrollmentId: enrollment.$id,
        studentId: student.$id,
        studentName: student.full_name,
        classId: student.training_class_id ?? null,
        className: (student.training_class_id && classById.get(student.training_class_id)) || student.training_class || "Sem turma",
        currentFeeCents: enrollment.monthly_fee_cents ?? 0,
        discountCents: enrollment.discount_cents ?? 0,
        contractEnd: enrollment.contract_end ? enrollment.contract_end.slice(0, 10) : null
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
}

export type AdjustmentSummary = {
  id: string;
  status: TuitionAdjustment["status"];
  mode: AdjustmentMode;
  effectiveFrom: string;
  totalMonthlyImpactCents: number;
  itemCount: number;
  createdAt: string;
  appliedAt: string | null;
};

function toSummary(row: TuitionAdjustment): AdjustmentSummary {
  return {
    id: row.$id,
    status: row.status,
    mode: row.mode,
    effectiveFrom: row.effective_from.slice(0, 10),
    totalMonthlyImpactCents: row.total_monthly_impact_cents,
    itemCount: row.item_count,
    createdAt: row.created_at,
    appliedAt: row.applied_at ?? null
  };
}

export async function listTuitionAdjustments(): Promise<AdjustmentSummary[]> {
  const rows = await cachedRead(
    { name: "tuition-adjustments", key: [], tags: [CACHE_TAGS.tuitionAdjustments], revalidate: 120 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<TuitionAdjustment>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.tuitionAdjustments,
        queries: [Query.orderDesc("created_at"), Query.limit(20)]
      });
      return result.rows;
    }
  );
  return rows.map(toSummary);
}

export async function createTuitionAdjustment(actor: Profile, raw: unknown) {
  requireAdmin(actor);
  const input = adjustmentInputSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const enrollments = await rowsByIds<Enrollment>(APPWRITE_IDS.tables.enrollments, input.items.map((item) => item.enrollmentId));
  const byId = new Map(enrollments.map((enrollment) => [enrollment.$id, enrollment]));
  let totalImpact = 0;
  const prepared = input.items.map((item) => {
    const enrollment = byId.get(item.enrollmentId);
    if (!enrollment || !ELIGIBLE_STATUSES.has(enrollment.status) || !(enrollment.monthly_fee_cents ?? 0)) throw new Error("enrollment_not_eligible");
    const previous = enrollment.monthly_fee_cents ?? 0;
    const discount = enrollment.discount_cents ?? 0;
    if (!item.excluded) totalImpact += netFeeCents(item.newFeeCents, discount) - netFeeCents(previous, discount);
    return { item, enrollment, previous };
  });
  const now = new Date().toISOString();
  const adjustment = await tables.createRow<TuitionAdjustment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.tuitionAdjustments,
    rowId: ID.unique(),
    permissions: [],
    data: {
      status: "draft",
      mode: input.mode,
      percent_bps: input.percent !== undefined ? Math.round(input.percent * 100) : undefined,
      reference_index_label: input.referenceIndexLabel || undefined,
      effective_from: `${input.effectiveFrom}T12:00:00.000Z`,
      message_template: input.messageTemplate,
      total_monthly_impact_cents: totalImpact,
      item_count: prepared.filter(({ item }) => !item.excluded).length,
      created_by_account_id: actor.account_id,
      created_at: now,
      updated_at: now
    }
  });
  await mapInChunks(prepared, async ({ item, enrollment, previous }) => {
    try {
      await tables.createRow<TuitionAdjustmentItem>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.tuitionAdjustmentItems,
        rowId: adjustmentItemRowId(adjustment.$id, enrollment.$id),
        permissions: [],
        data: {
          adjustment_id: adjustment.$id,
          enrollment_id: enrollment.$id,
          student_id: enrollment.student_id,
          previous_fee_cents: previous,
          new_fee_cents: item.newFeeCents,
          excluded: item.excluded
        }
      });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
    }
  });
  invalidateTags(CACHE_TAGS.tuitionAdjustments);
  await writeAuditEvent("tuition.adjustment.created", actor.account_id, "tuition_adjustment", adjustment.$id, {
    item_count: prepared.length,
    mode: input.mode
  });
  return { id: adjustment.$id };
}

async function loadAdjustment(adjustmentId: string) {
  const { tables, config } = createAppwriteAdminClient();
  return tables.getRow<TuitionAdjustment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.tuitionAdjustments, rowId: adjustmentId });
}

export type ApplyResult = { status: "applied" | "already_applied"; applied: number; skipped: number };

/**
 * Grava o novo valor em `enrollment.monthly_fee_cents`. Não toca em contratos nem em cobranças.
 * Idempotente por campanha + matrícula: itens já aplicados são pulados e repetir a chamada não regrava nada.
 * Se a mensalidade da matrícula mudou desde a simulação, o item é pulado (sem sobrescrever o ajuste manual).
 */
export async function applyTuitionAdjustment(actor: Profile, raw: unknown): Promise<ApplyResult> {
  requireAdmin(actor);
  const { adjustmentId } = adjustmentIdSchema.parse(raw);
  const adjustment = await loadAdjustment(adjustmentId);
  if (adjustment.status === "applied") return { status: "already_applied", applied: 0, skipped: 0 };
  if (adjustment.status !== "draft") throw new Error("adjustment_not_applicable");
  const { tables, config } = createAppwriteAdminClient();
  const items = await listAllRows<TuitionAdjustmentItem>(APPWRITE_IDS.tables.tuitionAdjustmentItems, [Query.equal("adjustment_id", [adjustmentId])]);
  const pending = items.filter((item) => !item.excluded && !item.applied_at);
  const now = new Date().toISOString();
  const outcomes = await mapInChunks(pending, async (item) => {
    const enrollment = await tables.getRow<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: item.enrollment_id });
    const current = enrollment.monthly_fee_cents ?? 0;
    if (current !== item.new_fee_cents) {
      if (current !== item.previous_fee_cents) return "skipped" as const;
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.enrollments,
        rowId: enrollment.$id,
        data: { monthly_fee_cents: item.new_fee_cents, updated_at: now }
      });
    }
    await tables.updateRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.tuitionAdjustmentItems,
      rowId: item.$id,
      data: { applied_at: now }
    });
    invalidateTags(CACHE_TAGS.student(item.student_id));
    return "applied" as const;
  });
  const applied = outcomes.filter((outcome) => outcome === "applied").length;
  const skipped = outcomes.length - applied;
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.tuitionAdjustments,
    rowId: adjustmentId,
    data: { status: "applied", applied_at: now, applied_by_account_id: actor.account_id, updated_at: now }
  });
  invalidateTags(CACHE_TAGS.tuitionAdjustments, CACHE_TAGS.enrollments);
  await writeAuditEvent("tuition.adjustment.applied", actor.account_id, "tuition_adjustment", adjustmentId, { applied, skipped });
  return { status: "applied", applied, skipped };
}

export async function cancelTuitionAdjustment(actor: Profile, raw: unknown) {
  requireAdmin(actor);
  const { adjustmentId } = adjustmentIdSchema.parse(raw);
  const adjustment = await loadAdjustment(adjustmentId);
  if (adjustment.status !== "draft") throw new Error("adjustment_not_cancellable");
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.tuitionAdjustments,
    rowId: adjustmentId,
    data: { status: "cancelled", updated_at: new Date().toISOString() }
  });
  invalidateTags(CACHE_TAGS.tuitionAdjustments);
  await writeAuditEvent("tuition.adjustment.cancelled", actor.account_id, "tuition_adjustment", adjustmentId);
}

export async function markAdjustmentItemNotified(actor: Profile, raw: unknown) {
  requireAdmin(actor);
  const input = markNotifiedSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const rowId = adjustmentItemRowId(input.adjustmentId, input.enrollmentId);
  const item = await tables.getRow<TuitionAdjustmentItem>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.tuitionAdjustmentItems, rowId });
  if (item.adjustment_id !== input.adjustmentId) throw new Error("item_not_found");
  const notifiedAt = input.notified ? new Date().toISOString() : null;
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.tuitionAdjustmentItems, rowId, data: { notified_at: notifiedAt } });
  return { notifiedAt };
}

/** Aviso geral opcional em /avisos (com push), sem valores individuais. Publica uma única vez por campanha. */
export async function publishAdjustmentNotice(actor: Profile, raw: unknown) {
  requireAdmin(actor);
  const { adjustmentId } = adjustmentIdSchema.parse(raw);
  const adjustment = await loadAdjustment(adjustmentId);
  if (adjustment.status === "cancelled") throw new Error("adjustment_cancelled");
  if (adjustment.notice_published_at) throw new Error("notice_already_published");
  const notice = buildGenericNotice({
    academy: (await getAcademyIdentity()).short_name,
    effectiveFromLabel: formatBusinessDateBr(adjustment.effective_from),
    indexLabel: adjustment.reference_index_label ?? undefined
  });
  await publishAnnouncement(actor, { title: notice.title, body: notice.body, audience: "all", actionUrl: "/avisos" });
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.tuitionAdjustments,
    rowId: adjustmentId,
    data: { notice_published_at: now, updated_at: now }
  });
  invalidateTags(CACHE_TAGS.tuitionAdjustments);
  await writeAuditEvent("tuition.adjustment.notice_published", actor.account_id, "tuition_adjustment", adjustmentId);
}

export type SendListRow = {
  enrollmentId: string;
  studentName: string;
  payerName: string;
  previousFeeCents: number;
  newFeeCents: number;
  discountCents: number;
  /** Link base `https://wa.me/55...` ou null quando não há telefone válido. */
  whatsappBase: string | null;
  notifiedAt: string | null;
};

export type SendList = {
  adjustment: AdjustmentSummary & {
    messageTemplate: string;
    referenceIndexLabel: string | null;
    noticePublishedAt: string | null;
  };
  rows: SendListRow[];
};

/** Lista de envio: uma linha por pagador. Nome e telefone são lidos agora e nunca copiados para a campanha. */
export async function getAdjustmentSendList(adjustmentId: string): Promise<SendList> {
  const { adjustmentId: id } = adjustmentIdSchema.parse({ adjustmentId });
  const adjustment = await loadAdjustment(id);
  const items = (await listAllRows<TuitionAdjustmentItem>(APPWRITE_IDS.tables.tuitionAdjustmentItems, [Query.equal("adjustment_id", [id])])).filter((item) => !item.excluded);
  const [students, enrollments] = await Promise.all([
    rowsByIds<Student>(APPWRITE_IDS.tables.students, items.map((item) => item.student_id)),
    rowsByIds<Enrollment>(APPWRITE_IDS.tables.enrollments, items.map((item) => item.enrollment_id))
  ]);
  const profiles = await rowsByIds<Profile>(APPWRITE_IDS.tables.profiles, students.map((student) => student.profile_id));
  const profileById = new Map(profiles.map((profile) => [profile.$id, profile]));
  const minorProfileIds = profiles.filter((profile) => profile.role === "minor_student").map((profile) => profile.$id);
  const guardianByMinor = new Map<string, string>();
  if (minorProfileIds.length > 0) {
    const { tables, config } = createAppwriteAdminClient();
    const links: Array<{ guardian_profile_id: string; student_profile_id: string }> = [];
    for (const group of chunks(minorProfileIds, 100)) {
      const result = await tables.listRows<import("node-appwrite").Models.Row & { guardian_profile_id: string; student_profile_id: string }>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.guardianStudentLinks,
        queries: [Query.equal("student_profile_id", group), Query.equal("status", ["active"]), Query.limit(100)]
      });
      links.push(...result.rows);
    }
    const guardians = await rowsByIds<Profile>(APPWRITE_IDS.tables.profiles, links.map((link) => link.guardian_profile_id));
    const guardianById = new Map(guardians.map((guardian) => [guardian.$id, guardian]));
    for (const link of links) {
      const guardian = guardianById.get(link.guardian_profile_id);
      if (guardian && !guardianByMinor.has(link.student_profile_id)) guardianByMinor.set(link.student_profile_id, guardian.full_name);
    }
  }
  const studentById = new Map(students.map((student) => [student.$id, student]));
  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.$id, enrollment]));
  const rows: SendListRow[] = items.flatMap((item) => {
    const student = studentById.get(item.student_id);
    if (!student) return [];
    const profile = profileById.get(student.profile_id);
    const isMinor = profile?.role === "minor_student";
    const phone = pickPayerPhone({ isMinor, whatsapp: student.whatsapp, guardianContact: student.guardian_contact });
    return [{
      enrollmentId: item.enrollment_id,
      studentName: student.full_name,
      payerName: (isMinor && profile && guardianByMinor.get(profile.$id)) || student.full_name,
      previousFeeCents: item.previous_fee_cents,
      newFeeCents: item.new_fee_cents,
      discountCents: enrollmentById.get(item.enrollment_id)?.discount_cents ?? 0,
      whatsappBase: whatsappLink(phone),
      notifiedAt: item.notified_at ?? null
    }];
  });
  rows.sort((a, b) => a.payerName.localeCompare(b.payerName, "pt-BR"));
  return {
    adjustment: {
      ...toSummary(adjustment),
      messageTemplate: adjustment.message_template,
      referenceIndexLabel: adjustment.reference_index_label ?? null,
      noticePublishedAt: adjustment.notice_published_at ?? null
    },
    rows
  };
}
