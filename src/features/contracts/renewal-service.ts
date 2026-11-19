import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { issueContractForEnrollment } from "@/features/contracts/contract-service";
import { classifyContractRenewalBucket, renewalEvent, type RenewalBucket } from "@/features/contracts/rules";
import { renewalSchema } from "@/features/contracts/schemas";
import type { Contract } from "@/features/contracts/types";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { notifyStudentEvent } from "@/features/notifications/notification-service";
import type { Enrollment, Student } from "@/features/students/types";
import { guardianContractPath, studentContractPath } from "@/lib/navigation/routes";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

export async function listContractsRequiringRenewal(referenceDate = new Date().toISOString()) {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<Contract>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.contracts,
    queries: [Query.equal("status", ["signed"]), Query.limit(500)],
  });
  return rows.rows
    .map((contract) => ({ contract, event: renewalEvent(contract.ends_at, referenceDate) }))
    .filter((item) => item.event);
}

export async function renewContract(actor: Profile, raw: unknown) {
  const input = renewalSchema.parse(raw);
  const bundle = await getEnrollmentBundleByStudentId(input.studentId);
  if (bundle.enrollment.status !== "awaiting_renewal") throw new Error("enrollment_not_awaiting_renewal");
  const { tables, config } = createAppwriteAdminClient();
  const previousRows = await tables.listRows<Contract>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.contracts,
    queries: [Query.equal("student_id", [input.studentId]), Query.orderDesc("ends_at"), Query.limit(1)],
  });
  const previous = previousRows.rows[0];
  if (!previous) throw new Error("previous_contract_required");
  const startsAt = new Date(previous.ends_at);
  startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  const endsAt = new Date(`${input.endsAt}T12:00:00Z`);
  if (endsAt <= startsAt) throw new Error("invalid_renewal_period");
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: bundle.enrollment.$id,
    data: { contract_start: startsAt.toISOString(), contract_end: endsAt.toISOString(), status: "under_review", updated_at: new Date().toISOString() },
  });
  let contract: Contract;
  try {
    contract = await issueContractForEnrollment(actor, input.studentId);
  } catch (error) {
    await tables.updateRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      rowId: bundle.enrollment.$id,
      data: { contract_start: bundle.enrollment.contract_start, contract_end: bundle.enrollment.contract_end, status: "awaiting_renewal", updated_at: new Date().toISOString() },
    });
    throw error;
  }
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: bundle.enrollment.$id,
    data: { status: "awaiting_signature", updated_at: new Date().toISOString() },
  });
  invalidateTags(CACHE_TAGS.contracts, CACHE_TAGS.contract(contract.$id), CACHE_TAGS.enrollments, CACHE_TAGS.student(input.studentId));
  await writeAuditEvent("contract.renewed", actor.account_id, "contract", contract.$id, { previous_contract_id: previous.$id });
  await notifyStudentEvent({
    studentId: input.studentId,
    audience: "signer",
    title: "Renovação de contrato disponível para assinatura",
    body: "O professor emitiu a renovação do contrato anual. Leia e assine pelo aplicativo para manter a matrícula em dia.",
    dedupeKey: `contract-renewed:${contract.$id}`,
    studentActionUrl: studentContractPath(contract.$id),
    guardianActionUrl: (profileId) => guardianContractPath(profileId, contract.$id),
    actorAccountId: actor.account_id
  }).catch(() => undefined);
  return contract;
}

export async function quickRenewContract(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = renewalSchema.parse(raw);
  const bundle = await getEnrollmentBundleByStudentId(input.studentId);
  const previousStatus = bundle.enrollment.status;
  if (previousStatus !== "awaiting_renewal" && previousStatus !== "active") {
    throw new Error("enrollment_not_renewable");
  }
  const { tables, config } = createAppwriteAdminClient();
  if (previousStatus === "active") {
    await tables.updateRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      rowId: bundle.enrollment.$id,
      data: { status: "awaiting_renewal", updated_at: new Date().toISOString() },
    });
  }
  try {
    return await renewContract(actor, input);
  } catch (error) {
    if (previousStatus === "active") {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.enrollments,
        rowId: bundle.enrollment.$id,
        data: { status: "active", updated_at: new Date().toISOString() },
      }).catch(() => undefined);
    }
    throw error;
  }
}

export type RenewalPipelineItem = {
  contractId: string;
  studentId: string;
  profileId: string;
  studentName: string;
  guardianName: string | null;
  enrollmentStatus: Enrollment["status"];
  monthlyFeeCents: number;
  /** Mensalidade líquida já definida na matrícula (reajuste aplicado) e ainda não refletida no contrato vigente. */
  pendingFeeCents: number | null;
  startsAt: string;
  endsAt: string;
  suggestedNextEnd: string;
  daysRemaining: number;
  bucket: RenewalBucket;
};

export type RenewalBucketSummary = {
  bucket: RenewalBucket;
  label: string;
  count: number;
  monthlyRevenueCents: number;
};

function addMonthsToIsoDay(isoDay: string, months: number) {
  const [year, month, day] = isoDay.slice(0, 10).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

const BUCKET_PRIORITY: Record<RenewalBucket, number> = {
  expired: 0,
  due_7d: 1,
  due_30d: 2,
  due_60d: 3,
  due_90d: 4,
  healthy: 5,
};

function loadRenewalPipelineDataset() {
  return cachedRead(
    {
      name: "admin-contract-renewal-pipeline",
      key: [],
      tags: [CACHE_TAGS.contracts, CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll],
      revalidate: 60,
    },
    async () => {
      const [contracts, enrollments, students] = await Promise.all([
        listAllRows<Contract>(APPWRITE_IDS.tables.contracts),
        listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
        listAllRows<Student>(APPWRITE_IDS.tables.students),
      ]);
      return { contracts, enrollments, students };
    }
  );
}

export async function getContractRenewalPipeline(filters: {
  bucket?: RenewalBucket;
  search?: string;
} = {}) {
  const { contracts, enrollments, students } = await loadRenewalPipelineDataset();
  const referenceDate = saoPauloToday();

  const studentById = new Map(students.map((student) => [student.$id, student]));
  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.$id, enrollment]));

  const latestSignedByStudent = new Map<string, Contract>();
  for (const contract of contracts) {
    if (contract.status !== "signed") continue;
    const existing = latestSignedByStudent.get(contract.student_id);
    if (!existing || contract.ends_at > existing.ends_at) {
      latestSignedByStudent.set(contract.student_id, contract);
    }
  }

  const items: RenewalPipelineItem[] = [];
  for (const contract of latestSignedByStudent.values()) {
    const enrollment = enrollmentById.get(contract.enrollment_id);
    const student = studentById.get(contract.student_id);
    if (!enrollment || !student) continue;
    if (enrollment.status === "cancelled" || enrollment.status === "draft") continue;

    const { bucket, daysRemaining } = classifyContractRenewalBucket(contract.ends_at, referenceDate);
    const pendingNetFee = Math.max(0, (enrollment.monthly_fee_cents ?? 0) - (enrollment.discount_cents ?? 0));
    const baseNextStart = contract.ends_at.slice(0, 10) >= referenceDate
      ? contract.ends_at.slice(0, 10)
      : referenceDate;
    items.push({
      contractId: contract.$id,
      studentId: contract.student_id,
      profileId: student.profile_id,
      studentName: contract.student_name || student.full_name,
      guardianName: contract.guardian_name ?? null,
      enrollmentStatus: enrollment.status,
      monthlyFeeCents: contract.monthly_fee_cents,
      pendingFeeCents: pendingNetFee > 0 && pendingNetFee !== contract.monthly_fee_cents ? pendingNetFee : null,
      startsAt: contract.starts_at,
      endsAt: contract.ends_at,
      suggestedNextEnd: addMonthsToIsoDay(baseNextStart, 12),
      daysRemaining,
      bucket,
    });
  }

  items.sort((a, b) => {
    const pDiff = BUCKET_PRIORITY[a.bucket] - BUCKET_PRIORITY[b.bucket];
    if (pDiff !== 0) return pDiff;
    if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
    return a.studentName.localeCompare(b.studentName, "pt-BR");
  });

  const bucketMeta: Array<{ bucket: RenewalBucket; label: string }> = [
    { bucket: "expired", label: "Vencidos" },
    { bucket: "due_7d", label: "Até 7 dias" },
    { bucket: "due_30d", label: "8 a 30 dias" },
    { bucket: "due_60d", label: "31 a 60 dias" },
    { bucket: "due_90d", label: "61 a 90 dias" },
    { bucket: "healthy", label: "Acima de 90 dias" },
  ];

  const buckets: RenewalBucketSummary[] = bucketMeta.map(({ bucket, label }) => {
    const matched = items.filter((item) => item.bucket === bucket);
    return {
      bucket,
      label,
      count: matched.length,
      monthlyRevenueCents: matched.reduce((sum, item) => sum + item.monthlyFeeCents, 0),
    };
  });

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = items.filter((item) => {
    if (filters.bucket && item.bucket !== filters.bucket) return false;
    if (!filters.bucket && item.bucket === "healthy") return false;
    if (normalizedSearch && !item.studentName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) {
      return false;
    }
    return true;
  });

  const within30d = items.filter((item) => item.bucket === "expired" || item.bucket === "due_7d" || item.bucket === "due_30d");
  const within90d = items.filter((item) => item.bucket !== "healthy");

  return {
    rows: filteredRows,
    buckets,
    summary: {
      totalSigned: items.length,
      expiredCount: items.filter((item) => item.bucket === "expired").length,
      due30dCount: items.filter((item) => item.bucket === "due_7d" || item.bucket === "due_30d").length,
      due60to90dCount: items.filter((item) => item.bucket === "due_60d" || item.bucket === "due_90d").length,
      revenueAtRisk30dCents: within30d.reduce((sum, item) => sum + item.monthlyFeeCents, 0),
      totalPipeline90dCount: within90d.length,
    },
  };
}
