import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { effectiveChargeStatus } from "@/features/billing/rules";
import { manualPaymentSchema, proofDecisionSchema, reversalSchema } from "@/features/billing/schemas";
import type { Charge, Payment, PaymentProof, PaymentReversal } from "@/features/billing/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

async function confirmedPayment(chargeId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, queries: [Query.equal("charge_id", [chargeId]), Query.equal("status", ["confirmed"]), Query.limit(1)] });
  return rows.rows[0] ?? null;
}

async function inTransaction<T>(work: (transactionId: string) => Promise<T>) {
  const { tables } = createAppwriteAdminClient();
  const transaction = await tables.createTransaction({ ttl: 60 });
  try {
    const result = await work(transaction.$id);
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
    return result;
  } catch (error) {
    await tables.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
}

export async function decidePaymentProof(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = proofDecisionSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const proof = await tables.getRow<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: input.proofId });
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: proof.charge_id });
  if (proof.status !== "pending") return { proof, payment: await confirmedPayment(charge.$id) };
  const now = new Date().toISOString();
  if (input.decision === "rejected") {
    const updated = await inTransaction(async (transactionId) => {
      const row = await tables.updateRow<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: proof.$id, data: { status: "rejected", rejection_reason: input.reason, reviewed_by_account_id: actor.account_id, reviewed_at: now, updated_at: now }, transactionId });
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: effectiveChargeStatus("pending", charge.due_date, now), updated_at: now }, transactionId });
      await tables.createRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.auditEvents, rowId: ID.unique(), data: { actor_account_id: actor.account_id, event_type: "billing.proof.rejected", entity_type: "payment_proof", entity_id: proof.$id, metadata: JSON.stringify({ charge_id: charge.$id, reason: input.reason }), created_at: now }, permissions: [], transactionId });
      return row;
    });
    return { proof: updated, payment: null };
  }
  const existing = await confirmedPayment(charge.$id);
  if (existing) {
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: proof.$id, data: { status: "approved", reviewed_by_account_id: actor.account_id, reviewed_at: proof.reviewed_at ?? now, updated_at: now } });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "paid", updated_at: now } });
    return { proof, payment: existing };
  }
  const paidAt = input.paidAt ? `${input.paidAt}T12:00:00.000Z` : now;
  const payment = await inTransaction(async (transactionId) => {
    const row = await tables.createRow<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, rowId: ID.unique(), data: { charge_id: charge.$id, proof_id: proof.$id, method: "pix_proof", amount_cents: charge.amount_cents, paid_at: paidAt, status: "confirmed", recorded_by_account_id: actor.account_id, created_at: now, updated_at: now }, permissions: [], transactionId });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: proof.$id, data: { status: "approved", reviewed_by_account_id: actor.account_id, reviewed_at: now, updated_at: now }, transactionId });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "paid", updated_at: now }, transactionId });
    await tables.createRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.auditEvents, rowId: ID.unique(), data: { actor_account_id: actor.account_id, event_type: "billing.payment.confirmed", entity_type: "payment", entity_id: row.$id, metadata: JSON.stringify({ charge_id: charge.$id, method: "pix_proof" }), created_at: now }, permissions: [], transactionId });
    return row;
  });
  return { proof, payment };
}

export async function recordManualPayment(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = manualPaymentSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: input.chargeId });
  const existing = await confirmedPayment(input.chargeId);
  if (existing) {
    if (charge.status !== "paid") await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "paid", updated_at: new Date().toISOString() } });
    return existing;
  }
  if (["cancelled", "paid"].includes(charge.status)) throw new Error("charge_not_payable");
  const now = new Date().toISOString();
  const pendingProofs = await tables.listRows<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, queries: [Query.equal("charge_id", [charge.$id]), Query.equal("status", ["pending"]), Query.limit(20)] });
  const payment = await inTransaction(async (transactionId) => {
    const row = await tables.createRow<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, rowId: ID.unique(), data: { charge_id: charge.$id, method: "manual", amount_cents: input.amountCents, paid_at: `${input.paidAt}T12:00:00.000Z`, status: "confirmed", recorded_by_account_id: actor.account_id, notes: input.notes, created_at: now, updated_at: now }, permissions: [], transactionId });
    await Promise.all(pendingProofs.rows.map((proof) => tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: proof.$id, data: { status: "superseded", reviewed_by_account_id: actor.account_id, reviewed_at: now, updated_at: now }, transactionId })));
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "paid", updated_at: now }, transactionId });
    await tables.createRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.auditEvents, rowId: ID.unique(), data: { actor_account_id: actor.account_id, event_type: "billing.payment.confirmed", entity_type: "payment", entity_id: row.$id, metadata: JSON.stringify({ charge_id: charge.$id, method: "manual" }), created_at: now }, permissions: [], transactionId });
    return row;
  });
  return payment;
}

export async function reversePayment(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = reversalSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const payment = await tables.getRow<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, rowId: input.paymentId });
  if (payment.status === "reversed") return payment;
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: payment.charge_id });
  const now = new Date().toISOString();
  const updated = await inTransaction(async (transactionId) => {
    await tables.createRow<PaymentReversal>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentReversals, rowId: ID.unique(), data: { payment_id: payment.$id, charge_id: charge.$id, reason: input.reason, reversed_by_account_id: actor.account_id, reversed_at: now, created_at: now }, permissions: [], transactionId });
    const row = await tables.updateRow<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, rowId: payment.$id, data: { status: "reversed", updated_at: now }, transactionId });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: effectiveChargeStatus("pending", charge.due_date, now), updated_at: now }, transactionId });
    await tables.createRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.auditEvents, rowId: ID.unique(), data: { actor_account_id: actor.account_id, event_type: "billing.payment.reversed", entity_type: "payment", entity_id: payment.$id, metadata: JSON.stringify({ charge_id: charge.$id, reason: input.reason }), created_at: now }, permissions: [], transactionId });
    return row;
  });
  return updated;
}

export async function listPayments() {
  const { tables, config } = createAppwriteAdminClient();
  const rows: Payment[] = [];
  let cursor: string | undefined;
  do {
    const result = await tables.listRows<Payment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.payments, queries: [Query.orderDesc("paid_at"), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...result.rows);
    cursor = result.rows.length === 500 ? result.rows.at(-1)?.$id : undefined;
  } while (cursor);
  return rows;
}
