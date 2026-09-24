import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { billingSettingsSchema } from "@/features/billing/schemas";
import type { BillingSettings } from "@/features/billing/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function getBillingSettings() {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<BillingSettings>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.billingSettings, queries: [Query.limit(1)] });
  return result.rows[0] ?? null;
}

export async function saveBillingSettings(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = billingSettingsSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const current = await getBillingSettings();
  const now = new Date().toISOString();
  const data = { pix_key: input.pixKey, pix_key_type: input.pixKeyType, beneficiary_name: input.beneficiaryName, instructions: input.instructions, updated_by_account_id: actor.account_id, updated_at: now };
  const settings = current
    ? await tables.updateRow<BillingSettings>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.billingSettings, rowId: current.$id, data })
    : await tables.createRow<BillingSettings>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.billingSettings, rowId: ID.unique(), data: { ...data, created_at: now }, permissions: [] });
  await writeAuditEvent("billing.settings.updated", actor.account_id, "billing_settings", settings.$id, { pix_key_type: input.pixKeyType });
  return settings;
}
