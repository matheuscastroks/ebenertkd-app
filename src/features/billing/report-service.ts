import "server-only";

import { cache } from "react";
import { Query } from "node-appwrite";
import { availableClosingCompetences, buildMonthlyClosingReport } from "@/features/billing/closing-rules";
import { billingSummary, csvCell } from "@/features/billing/rules";
import { listCharges } from "@/features/billing/charge-service";
import { listPayments } from "@/features/billing/payment-service";
import type { Charge, ChargeStatus, PaymentProof, PaymentReversal } from "@/features/billing/types";
import type { Student, StudentDocument } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloCurrentCompetence, saoPauloToday } from "@/lib/dates";

type BillingFilters = NonNullable<Parameters<typeof listCharges>[0]> & { student?: string; trainingClass?: string; page?: number };

export type BillingMonthlyPoint = {
  competence: string;
  label: string;
  receivedCents: number;
  openCents: number;
};

const COMPETENCE_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

function shiftMonth(competence: string, delta: number) {
  const [year, month] = competence.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatShortCompetence(competence: string) {
  const [year, month] = competence.split("-").map(Number);
  return `${COMPETENCE_MONTHS[month - 1]}/${String(year).slice(-2)}`;
}

function buildBillingMonthlySeries(charges: Charge[], count = 6, now = new Date()): BillingMonthlyPoint[] {
  const validCharges = charges.filter((charge) => charge.status !== "cancelled" && /^\d{4}-(0[1-9]|1[0-2])$/.test(charge.competence));
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const competencesInData = [...new Set(validCharges.map((charge) => charge.competence))].sort();
  const latestCompetence = competencesInData.at(-1);
  const windowStart = shiftMonth(currentMonth, -(count - 1));
  const anchorMonth =
    latestCompetence && latestCompetence > currentMonth
      ? latestCompetence
      : competencesInData.some((competence) => competence >= windowStart) || !latestCompetence
        ? currentMonth
        : latestCompetence;

  const months = Array.from({ length: count }, (_, index) => shiftMonth(anchorMonth, -(count - 1 - index)));
  return months.map((competence) => {
    const monthCharges = validCharges.filter((charge) => charge.competence === competence);
    const receivedCents = monthCharges.filter((charge) => charge.status === "paid").reduce((total, charge) => total + charge.amount_cents, 0);
    const openCents = monthCharges
      .filter((charge) => charge.status === "pending" || charge.status === "overdue" || charge.status === "proof_under_review")
      .reduce((total, charge) => total + charge.amount_cents, 0);
    return { competence, label: formatShortCompetence(competence), receivedCents, openCents };
  });
}

export const BILLING_PAGE_SIZE = 20;
const loadBillingLedger = cache(async () => Promise.all([listCharges(), listPayments()]));

export async function getBillingTrend(count = 6) {
  const [charges] = await loadBillingLedger();
  return buildBillingMonthlySeries(charges, count);
}

async function allRows<Row extends { $id: string }>(tableId: string, queries: string[] = []) {
  const { tables, config } = createAppwriteAdminClient();
  const rows: Row[] = [];
  let cursor: string | undefined;
  do {
    const page = await tables.listRows<Row & import("node-appwrite").Models.Row>({ databaseId: config.databaseId, tableId, queries: [...queries, Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...page.rows);
    cursor = page.rows.length === 500 ? page.rows.at(-1)?.$id : undefined;
  } while (cursor);
  return rows;
}

function listBillingStudents() {
  return cachedRead(
    { name: "billing-students", key: [], tags: [CACHE_TAGS.enrollments, CACHE_TAGS.billingCharges, CACHE_TAGS.studentsAll], revalidate: 60 },
    () => allRows<Student>(APPWRITE_IDS.tables.students)
  );
}

function countChargesByStatus(charges: Array<{ status: ChargeStatus }>): Record<ChargeStatus, number> {
  const counts: Record<ChargeStatus, number> = { pending: 0, proof_under_review: 0, paid: 0, overdue: 0, cancelled: 0 };
  for (const charge of charges) counts[charge.status] = (counts[charge.status] ?? 0) + 1;
  return counts;
}

export async function getBillingOverview(filters: BillingFilters = {}) {
  const [[allCharges, payments], students] = await Promise.all([loadBillingLedger(), listBillingStudents()]);
  const scopedCharges = allCharges.filter((charge) => (!filters.competence || charge.competence === filters.competence) && (!filters.type || charge.charge_type === filters.type));
  const allNames = new Map(students.map((student) => [student.$id, student.full_name]));
  const normalizedSearch = filters.student?.trim().toLocaleLowerCase("pt-BR");
  const allowedStudents = new Set(students.filter((student) => (!normalizedSearch || student.full_name.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) && (!filters.trainingClass || student.training_class_id === filters.trainingClass)).map((student) => student.$id));
  // Contagem por situação ignora o filtro de situação: alimenta os chips da tela de Cobranças.
  const chargesInScope = scopedCharges.filter((charge) => allowedStudents.has(charge.student_id));
  const statusCounts = countChargesByStatus(chargesInScope);
  const filteredCharges = filters.status ? chargesInScope.filter((charge) => charge.status === filters.status) : chargesInScope;
  const requestedPage = filters.page ? Math.max(1, Math.trunc(filters.page)) : undefined;
  const totalPages = Math.ceil(filteredCharges.length / BILLING_PAGE_SIZE);
  const page = requestedPage ? Math.min(requestedPage, Math.max(1, totalPages)) : undefined;
  const charges = page ? filteredCharges.slice((page - 1) * BILLING_PAGE_SIZE, page * BILLING_PAGE_SIZE) : filteredCharges;
  const visibleStudentIds = [...new Set(charges.map((charge) => charge.student_id))];
  const visibleChargeIds = new Set(charges.map((charge) => charge.$id));
  const returnedPayments = page ? payments.filter((payment) => visibleChargeIds.has(payment.charge_id)) : payments;
  const names = page
    ? new Map(visibleStudentIds.flatMap((id) => {
        const name = allNames.get(id);
        return name ? [[id, name] as const] : [];
      }))
    : allNames;
  const [photoDocuments, proofs] = await Promise.all([
    filters.page && visibleStudentIds.length ? allRows<StudentDocument>(APPWRITE_IDS.tables.studentDocuments, [Query.equal("student_id", visibleStudentIds), Query.equal("document_type", ["profile_photo"])]) : Promise.resolve([]),
    filters.page && charges.length ? allRows<PaymentProof>(APPWRITE_IDS.tables.paymentProofs, [Query.equal("charge_id", charges.map((charge) => charge.$id)), Query.equal("status", ["pending"])]) : Promise.resolve([])
  ]);
  const photosByStudent = new Map(photoDocuments.filter((document) => document.status !== "rejected").sort((a, b) => a.created_at.localeCompare(b.created_at)).map((document) => [document.student_id, document.$id]));
  const proofsByCharge = new Map(proofs.map((proof) => [proof.charge_id, proof]));
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return {
    charges,
    payments: returnedPayments,
    names,
    photosByStudent,
    proofsByCharge,
    summary: billingSummary(allCharges, payments, start, end),
    monthlySeries: buildBillingMonthlySeries(allCharges, 6, now),
    statusCounts,
    pagination: { page: page ?? 1, pageSize: BILLING_PAGE_SIZE, total: filteredCharges.length, totalPages }
  };
}

export async function exportBillingCsv(filters: BillingFilters = {}) {
  const { charges, names, payments } = await getBillingOverview(filters);
  const header = ["Aluno", "Tipo", "Competência", "Vencimento", "Valor", "Pagamento", "Status"];
  const lines = charges.map((charge) => { const payment = payments.find((item) => item.charge_id === charge.$id && item.status === "confirmed"); return [names.get(charge.student_id) ?? charge.student_id, charge.charge_type, charge.competence, charge.due_date.slice(0, 10), (charge.amount_cents / 100).toFixed(2), payment?.paid_at.slice(0, 10) ?? "", charge.status]; });
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
}

function listPaymentReversalsCached() {
  return cachedRead(
    {
      name: "list-payment-reversals",
      key: [],
      tags: [CACHE_TAGS.billingCharges],
      revalidate: 60,
    },
    () => listAllRows<PaymentReversal>(APPWRITE_IDS.tables.paymentReversals)
  );
}

export async function getMonthlyClosingOverview(requestedCompetence?: string) {
  const currentCompetence = saoPauloCurrentCompetence();
  const competence =
    requestedCompetence && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedCompetence)
      ? requestedCompetence
      : currentCompetence;

  const [[charges, payments], reversals, students] = await Promise.all([
    loadBillingLedger(),
    listPaymentReversalsCached(),
    listBillingStudents(),
  ]);

  const report = buildMonthlyClosingReport({
    competence,
    charges,
    payments,
    reversals,
    referenceDate: saoPauloToday(),
  });

  const names = new Map(students.map((student) => [student.$id, student.full_name]));
  const openCharges = charges
    .filter(
      (charge) =>
        charge.competence === competence &&
        (charge.status === "overdue" || charge.status === "proof_under_review")
    )
    .map((charge) => ({
      ...charge,
      studentName: names.get(charge.student_id) ?? "Aluno não identificado",
    }));

  return {
    report,
    competences: availableClosingCompetences(charges, currentCompetence),
    monthlySeries: buildBillingMonthlySeries(charges, 6),
    openCharges,
  };
}
