import "server-only";

import { AppwriteException, ID, type Models } from "node-appwrite";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import { DEFAULT_ACADEMY_IDENTITY, POLICY_SCHEMA_VERSION, type AcademyPolicies, type PolicySection } from "@/features/academy/defaults";
import { academyIdentitySchema, isPolicySection, parsePolicyData, parsePolicyInput } from "@/features/academy/schemas";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { safeErrorMessage } from "@/lib/security/safe-error";

/** Linha única da identidade e uma linha por seção de política: ids determinísticos evitam duplicatas. */
export const ACADEMY_SETTINGS_ROW_ID = "academy-settings";
export const policyRowId = (section: PolicySection) => `policy-${section}`;

type StoredRow = Models.Row & Record<string, unknown> & { revision: number };

function requireAdmin(actor: Profile) {
  if (actor.role !== "admin") throw new Error("admin_required");
}

async function readRow(tableId: string, rowId: string): Promise<StoredRow | null> {
  const { tables, config } = createAppwriteAdminClient();
  try {
    return await tables.getRow<StoredRow>({ databaseId: config.databaseId, tableId, rowId });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return null;
    throw error;
  }
}

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  return Object.keys(after).filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after[key] ?? null));
}

/** Histórico append-only. Falha aqui não desfaz a gravação principal (já aplicada): registra sem conteúdo. */
async function appendRevision(input: {
  scope: "settings" | "policy" | "belt_ranks";
  section: string;
  entityId: string;
  revision: number;
  before: unknown;
  after: unknown;
  reason?: string;
  actor: Profile;
}) {
  try {
    const { tables, config } = createAppwriteAdminClient();
    await tables.createRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.academyConfigRevisions,
      rowId: ID.unique(),
      data: {
        scope: input.scope,
        section: input.section,
        entity_id: input.entityId,
        revision: input.revision,
        before_json: input.before == null ? undefined : JSON.stringify(input.before),
        after_json: JSON.stringify(input.after),
        reason: input.reason?.slice(0, 500) || undefined,
        changed_by_account_id: input.actor.account_id,
        changed_at: new Date().toISOString()
      },
      permissions: []
    });
    invalidateTags(CACHE_TAGS.academyRevisions);
  } catch (error) {
    console.error(`[academy-config] revision_append_failed: ${safeErrorMessage(error)}`);
  }
}

/** Grava a linha com concorrência otimista: `expectedRevision` precisa ser a revisão atual (0 = ainda não existe). */
async function writeVersionedRow(tableId: string, rowId: string, current: StoredRow | null, expectedRevision: number, data: Record<string, unknown>, createExtra: Record<string, unknown>) {
  if ((current?.revision ?? 0) !== expectedRevision) throw new Error("revision_conflict");
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const revision = expectedRevision + 1;
  if (current) {
    return tables.updateRow<StoredRow>({ databaseId: config.databaseId, tableId, rowId, data: { ...data, revision, updated_at: now } });
  }
  try {
    return await tables.createRow<StoredRow>({ databaseId: config.databaseId, tableId, rowId, data: { ...data, ...createExtra, revision, created_at: now, updated_at: now }, permissions: [] });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) throw new Error("revision_conflict");
    throw error;
  }
}

export async function saveAcademyIdentity(actor: Profile, raw: unknown, expectedRevision: number, reason?: string) {
  requireAdmin(actor);
  const current = await readRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID);
  // Campos que a tela de identidade não edita (federação, definida pelas faixas) mantêm o valor salvo.
  const input = academyIdentitySchema.parse({ federation: current?.federation ?? null, ...(raw as Record<string, unknown>) });
  const data = { ...input, timezone: DEFAULT_ACADEMY_IDENTITY.timezone, updated_by_account_id: actor.account_id };
  const saved = await writeVersionedRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID, current, expectedRevision, data, {});
  invalidateTags(CACHE_TAGS.academySettings);
  const fields = changedFields(current, input);
  await appendRevision({ scope: "settings", section: "identity", entityId: saved.$id, revision: saved.revision, before: current ? pickFields(current, Object.keys(input)) : null, after: input, reason, actor });
  // Auditoria sem dado pessoal: só os nomes dos campos alterados.
  await writeAuditEvent("academy.settings.updated", actor.account_id, "academy_settings", saved.$id, { revision: saved.revision, changed_fields: fields });
  return saved;
}

export async function savePolicySection<S extends PolicySection>(actor: Profile, section: S, raw: unknown, expectedRevision: number, reason?: string) {
  requireAdmin(actor);
  if (!isPolicySection(section)) throw new Error("invalid_policy_section");
  const rowId = policyRowId(section);
  const current = await readRow(APPWRITE_IDS.tables.academyPolicies, rowId);
  // A tela envia só os campos que mostra: os demais mantêm o valor salvo (ou o padrão).
  const policy: AcademyPolicies[S] = parsePolicyInput(section, { ...parsePolicyData(section, current?.data_json), ...(raw as Record<string, unknown>) });
  const before = current ? safeJson(current.data_json) : null;
  const data = { section, schema_version: POLICY_SCHEMA_VERSION, data_json: JSON.stringify(policy), updated_by_account_id: actor.account_id };
  const saved = await writeVersionedRow(APPWRITE_IDS.tables.academyPolicies, rowId, current, expectedRevision, data, {});
  invalidateTags(CACHE_TAGS.academyPolicies);
  await appendRevision({ scope: "policy", section, entityId: saved.$id, revision: saved.revision, before, after: policy, reason, actor });
  await writeAuditEvent("academy.policy.updated", actor.account_id, "academy_policy", saved.$id, { section, revision: saved.revision, changed_fields: changedFields(before as Record<string, unknown> | null, policy as Record<string, unknown>) });
  return { policy, revision: saved.revision };
}

function safeJson(value: unknown) {
  try {
    return typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function pickFields(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, row[key] ?? null]));
}
