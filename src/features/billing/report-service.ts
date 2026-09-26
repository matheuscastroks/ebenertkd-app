import "server-only";

import { cache } from "react";
import { Query } from "node-appwrite";
import { billingSummary, csvCell } from "@/features/billing/rules";
import { listCharges } from "@/features/billing/charge-service";
import { listPayments } from "@/features/billing/payment-service";
import type { PaymentProof } from "@/features/billing/types";
import type { Student, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

type BillingFilters = NonNullable<Parameters<typeof listCharges>[0]> & { student?: string; trainingClass?: string; page?: number };

export const BILLING_PAGE_SIZE = 20;
const loadBillingLedger = cache(async () => Promise.all([listCharges(), listPayments()]));

export async function getBillingSummary() {
  const [charges, payments] = await loadBillingLedger();
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return billingSummary(charges, payments, start, end);
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

export async function getBillingOverview(filters: BillingFilters = {}) {
  const [allCharges, payments] = await loadBillingLedger();
  const rawCharges = allCharges.filter((charge) => (!filters.status || charge.status === filters.status) && (!filters.competence || charge.competence === filters.competence) && (!filters.type || charge.charge_type === filters.type));
  const students = await allRows<Student>(APPWRITE_IDS.tables.students);
  const names = new Map(students.map((student) => [student.$id, student.full_name]));
  const normalizedSearch = filters.student?.trim().toLocaleLowerCase("pt-BR");
  const allowedStudents = new Set(students.filter((student) => (!normalizedSearch || student.full_name.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) && (!filters.trainingClass || student.training_class_id === filters.trainingClass)).map((student) => student.$id));
  const filteredCharges = rawCharges.filter((charge) => allowedStudents.has(charge.student_id));
  const requestedPage = filters.page ? Math.max(1, Math.trunc(filters.page)) : undefined;
  const totalPages = Math.ceil(filteredCharges.length / BILLING_PAGE_SIZE);
  const page = requestedPage ? Math.min(requestedPage, Math.max(1, totalPages)) : undefined;
  const charges = page ? filteredCharges.slice((page - 1) * BILLING_PAGE_SIZE, page * BILLING_PAGE_SIZE) : filteredCharges;
  const visibleStudentIds = [...new Set(charges.map((charge) => charge.student_id))];
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
    payments,
    names,
    photosByStudent,
    proofsByCharge,
    summary: billingSummary(allCharges, payments, start, end),
    pagination: { page: page ?? 1, pageSize: BILLING_PAGE_SIZE, total: filteredCharges.length, totalPages }
  };
}

export async function exportBillingCsv(filters: BillingFilters = {}) {
  const { charges, names, payments } = await getBillingOverview(filters);
  const header = ["Aluno", "Tipo", "Competência", "Vencimento", "Valor", "Pagamento", "Status"];
  const lines = charges.map((charge) => { const payment = payments.find((item) => item.charge_id === charge.$id && item.status === "confirmed"); return [names.get(charge.student_id) ?? charge.student_id, charge.charge_type, charge.competence, charge.due_date.slice(0, 10), (charge.amount_cents / 100).toFixed(2), payment?.paid_at.slice(0, 10) ?? "", charge.status]; });
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
}
