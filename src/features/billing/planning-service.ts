import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { listCharges } from "@/features/billing/charge-service";
import { listPayments } from "@/features/billing/payment-service";
import { buildPlanningBaseline, type PlanningBaseline } from "@/features/billing/planning-baseline";
import { financeScenarioIdSchema, financeScenarioSchema } from "@/features/billing/planning-schemas";
import type { FinanceScenario } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import type { Enrollment } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

function loadContractsAndEnrollments() {
  return cachedRead(
    { name: "planning-contracts-enrollments", key: [], tags: [CACHE_TAGS.contracts, CACHE_TAGS.enrollments], revalidate: 120 },
    async () => {
      const [contracts, enrollments] = await Promise.all([
        listAllRows<Contract>(APPWRITE_IDS.tables.contracts),
        listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments)
      ]);
      return { contracts, enrollments };
    }
  );
}

/** Números reais da academia para pré-preencher a calculadora. Autorização é feita por quem chama. */
export async function getPlanningBaseline(): Promise<PlanningBaseline> {
  const [{ contracts, enrollments }, charges, payments] = await Promise.all([loadContractsAndEnrollments(), listCharges(), listPayments()]);
  return buildPlanningBaseline({ contracts, enrollments, charges, payments, today: saoPauloToday() });
}

export type SavedScenario = {
  id: string;
  name: string;
  fixedCosts: Array<{ label: string; amountCents: number }>;
  variableCostCents: number;
  paymentFeePercent: number;
  proLaboreCents: number;
  reserveCents: number;
  defaultRatePercent: number;
  updatedAt: string;
};

function parseFixedCosts(raw: string): SavedScenario["fixedCosts"] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const label = typeof item?.label === "string" ? item.label : "";
      const amountCents = Number(item?.amountCents);
      return label && Number.isFinite(amountCents) && amountCents >= 0 ? [{ label, amountCents: Math.round(amountCents) }] : [];
    });
  } catch {
    return [];
  }
}

export function toSavedScenario(row: FinanceScenario): SavedScenario {
  return {
    id: row.$id,
    name: row.name,
    fixedCosts: parseFixedCosts(row.fixed_costs_json),
    variableCostCents: row.variable_cost_cents,
    paymentFeePercent: row.payment_fee_bps / 100,
    proLaboreCents: row.pro_labore_cents,
    reserveCents: row.reserve_cents,
    defaultRatePercent: row.default_rate_bps / 100,
    updatedAt: row.updated_at
  };
}

export async function listFinanceScenarios(): Promise<SavedScenario[]> {
  const rows = await cachedRead(
    { name: "finance-scenarios", key: [], tags: [CACHE_TAGS.financeScenarios], revalidate: 300 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<FinanceScenario>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.financeScenarios,
        queries: [Query.orderDesc("updated_at"), Query.limit(50)]
      });
      return result.rows;
    }
  );
  return rows.map(toSavedScenario);
}

export async function saveFinanceScenario(actor: Profile, raw: unknown): Promise<SavedScenario> {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = financeScenarioSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const data = {
    name: input.name,
    fixed_costs_json: JSON.stringify(input.fixedCosts),
    variable_cost_cents: input.variableCostCents,
    payment_fee_bps: Math.round(input.paymentFeePercent * 100),
    pro_labore_cents: input.proLaboreCents,
    reserve_cents: input.reserveCents,
    default_rate_bps: Math.round(input.defaultRatePercent * 100),
    updated_at: now
  };
  const row = input.id
    ? await tables.updateRow<FinanceScenario>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.financeScenarios, rowId: input.id, data })
    : await tables.createRow<FinanceScenario>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.financeScenarios,
        rowId: ID.unique(),
        data: { ...data, created_by_account_id: actor.account_id, created_at: now },
        permissions: []
      });
  invalidateTags(CACHE_TAGS.financeScenarios);
  await writeAuditEvent(input.id ? "finance.scenario.updated" : "finance.scenario.created", actor.account_id, "finance_scenario", row.$id);
  return toSavedScenario(row);
}

export async function deleteFinanceScenario(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { id } = financeScenarioIdSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  await tables.deleteRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.financeScenarios, rowId: id });
  invalidateTags(CACHE_TAGS.financeScenarios);
  await writeAuditEvent("finance.scenario.deleted", actor.account_id, "finance_scenario", id);
}
