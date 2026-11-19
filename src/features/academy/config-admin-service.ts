import "server-only";

import { AppwriteException, ID, Query, type Models } from "node-appwrite";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import { DEFAULT_ACADEMY_IDENTITY, POLICY_SCHEMA_VERSION, type AcademyPolicies, type PolicySection } from "@/features/academy/defaults";
import { resolveRankConfigs, type RankRow } from "@/features/academy/belt-rules";
import { findBeltPreset } from "@/features/academy/presets";
import { presetToPatches } from "@/features/academy/preset-rules";
import {
  countStudentsByRank,
  disabledRanksInUse,
  planRankChanges,
  RankInUseError,
  type RankChange,
  type RankPatch
} from "@/features/academy/rank-changes";
import { RankValidationError } from "@/features/academy/rank-schemas";
import { academyIdentitySchema, isPolicySection, parsePolicyData, parsePolicyInput } from "@/features/academy/schemas";
import type { Student } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { safeErrorMessage } from "@/lib/security/safe-error";

/** Linha única da identidade e uma linha por seção de política: ids determinísticos evitam duplicatas. */
export const ACADEMY_SETTINGS_ROW_ID = "academy-settings";
export const policyRowId = (section: PolicySection) => `policy-${section}`;
export const rankRowId = (rankKey: string) => `rank-${rankKey}`;

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

/* ------------------------------------------------------------------ graduações (belt_rank_settings) */

async function readRankRows(): Promise<StoredRow[]> {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<StoredRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.beltRankSettings, queries: [Query.limit(50)] });
  return result.rows;
}

/** Grava as alterações já validadas: concorrência por revisão em cada linha, revisão append-only e auditoria sem dado pessoal. */
async function persistRankChanges(actor: Profile, changes: RankChange[], rows: StoredRow[], reason: string | undefined, event: "belt_ranks.updated" | "belt_ranks.preset_applied", extra: Record<string, unknown> = {}) {
  const rowByKey = new Map(rows.map((row) => [String(row.rank_key), row]));
  const saved: Array<{ rank_key: string; revision: number }> = [];
  for (const change of changes) {
    const current = rowByKey.get(change.rank_key) ?? null;
    const data = { ...change.after, rank_key: change.rank_key, updated_by_account_id: actor.account_id };
    const row = await writeVersionedRow(APPWRITE_IDS.tables.beltRankSettings, rankRowId(change.rank_key), current, change.revision, data, {});
    saved.push({ rank_key: change.rank_key, revision: row.revision });
    await appendRevision({ scope: "belt_ranks", section: change.rank_key, entityId: row.$id, revision: row.revision, before: current ? change.before : null, after: change.after, reason, actor });
  }
  if (saved.length > 0) invalidateTags(CACHE_TAGS.beltRanks);
  await writeAuditEvent(event, actor.account_id, "belt_rank_settings", "belt-ranks", {
    ranks: changes.map((change) => ({ rank_key: change.rank_key, changed_fields: change.changedFields })),
    ...extra
  });
  return saved;
}

/**
 * Salva as alterações de graduações (nome, cores, tempos, taxa, habilitação…). Nunca toca alunos nem histórico:
 * renomear ou recolorir muda só a exibição daqui em diante. Uma graduação com alunos não pode ser desativada.
 */
export async function saveBeltRanks(actor: Profile, patches: RankPatch[], reason?: string) {
  requireAdmin(actor);
  const rows = await readRankRows();
  const { changes, issues } = planRankChanges(resolveRankConfigs(rows as unknown as RankRow[]), patches);
  if (issues.length > 0) throw new RankValidationError(issues);
  if (changes.length === 0) return { changed: 0 };
  if (changes.some((change) => change.before.enabled && !change.after.enabled)) {
    const students = await listAllRows<Student>(APPWRITE_IDS.tables.students);
    const blocked = disabledRanksInUse(changes, countStudentsByRank(students));
    if (blocked.length > 0) throw new RankInUseError(blocked);
  }
  const saved = await persistRankChanges(actor, changes, rows, reason, "belt_ranks.updated");
  return { changed: saved.length };
}

/** Aplica um modelo (CBTKD, ITF, Kukkiwon): só nomes, cores e formas, mais os termos "Poomsae/Tul" e "Gub/Gup/Geup". */
export async function applyBeltPreset(actor: Profile, presetId: string, reason?: string) {
  requireAdmin(actor);
  const preset = findBeltPreset(presetId);
  if (!preset) throw new Error("invalid_preset");
  const rows = await readRankRows();
  const current = resolveRankConfigs(rows as unknown as RankRow[]);
  const { changes, issues } = planRankChanges(current, presetToPatches(current, preset));
  if (issues.length > 0) throw new RankValidationError(issues);
  await persistRankChanges(actor, changes, rows, reason ?? `Modelo ${preset.label}`, "belt_ranks.preset_applied", { preset: preset.id, preset_version: preset.version });

  const policyRow = await readRow(APPWRITE_IDS.tables.academyPolicies, policyRowId("belts"));
  await savePolicySection(actor, "belts", { form_label: preset.formLabel, level_label: preset.levelLabel }, policyRow?.revision ?? 0, `Modelo ${preset.label}`);

  // Informativo: lembra qual modelo foi aplicado por último. Só se a identidade já foi salva.
  const identity = await readRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID);
  if (identity) {
    const saved = await writeVersionedRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID, identity, identity.revision, { federation: preset.id, updated_by_account_id: actor.account_id }, {});
    invalidateTags(CACHE_TAGS.academySettings);
    await appendRevision({ scope: "settings", section: "identity", entityId: saved.$id, revision: saved.revision, before: { federation: identity.federation ?? null }, after: { federation: preset.id }, reason: `Modelo ${preset.label}`, actor });
  }
  return { changed: changes.length, preset: preset.id };
}

/* ------------------------------------------------------------------ restauração e assistente */

const IDENTITY_EDITABLE_FIELDS = Object.keys(DEFAULT_ACADEMY_IDENTITY).filter((key) => !["logo_file_id", "timezone", "setup_completed_at"].includes(key));

/**
 * Restaura uma versão do histórico: aplica o conteúdo gravado naquela revisão pelo caminho normal de gravação, então gera uma
 * NOVA revisão (o histórico nunca é reescrito) e respeita a concorrência: `expectedRevision` é a revisão mais recente da seção
 * que o professor viu; se outra alteração entrou no meio, falha com `revision_conflict`.
 */
export async function restoreConfigRevision(actor: Profile, revisionId: string, expectedRevision: number) {
  requireAdmin(actor);
  const row = await readRow(APPWRITE_IDS.tables.academyConfigRevisions, revisionId);
  if (!row) throw new Error("revision_not_found");
  const target = safeJson(row.after_json);
  if (!target) throw new Error("revision_not_restorable");
  const section = String(row.section);
  const reason = `Restaurada a versão ${row.revision}`;

  if (row.scope === "policy") {
    if (!isPolicySection(section)) throw new Error("invalid_policy_section");
    const saved = await savePolicySection(actor, section, target, expectedRevision, reason);
    return { scope: "policy" as const, section, revision: saved.revision };
  }
  if (row.scope === "settings") {
    const current = await readRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID);
    const base = current ? pickFields(current, IDENTITY_EDITABLE_FIELDS) : {};
    const saved = await saveAcademyIdentity(actor, { ...base, ...target }, expectedRevision, reason);
    return { scope: "settings" as const, section, revision: saved.revision };
  }
  if (row.scope === "belt_ranks") {
    const result = await saveBeltRanks(actor, [{ rank_key: section, revision: expectedRevision, data: target }], reason);
    return { scope: "belt_ranks" as const, section, changed: result.changed };
  }
  throw new Error("revision_not_restorable");
}

/** Lê a linha do histórico para a tela (admin). Mais recentes primeiro, no máximo 200. */
export async function listConfigRevisionRows(actor: Profile) {
  requireAdmin(actor);
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<Models.Row & { scope: string; section: string; revision: number; before_json?: string; after_json?: string; reason?: string; changed_at: string }>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.academyConfigRevisions,
    queries: [Query.orderDesc("changed_at"), Query.limit(200)]
  });
  return result.rows;
}

/** Marca o assistente de primeira configuração como concluído (exige que a identidade já tenha sido salva no passo 1). */
export async function completeSetup(actor: Profile) {
  requireAdmin(actor);
  const current = await readRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID);
  if (!current) throw new Error("identity_required");
  if (current.setup_completed_at) return { revision: current.revision };
  const now = new Date().toISOString();
  const saved = await writeVersionedRow(APPWRITE_IDS.tables.academySettings, ACADEMY_SETTINGS_ROW_ID, current, current.revision, { setup_completed_at: now, updated_by_account_id: actor.account_id }, {});
  invalidateTags(CACHE_TAGS.academySettings);
  await appendRevision({ scope: "settings", section: "identity", entityId: saved.$id, revision: saved.revision, before: { setup_completed_at: null }, after: { setup_completed_at: now }, reason: "Assistente de primeiros passos concluído", actor });
  await writeAuditEvent("academy.setup.completed", actor.account_id, "academy_settings", saved.$id, { revision: saved.revision });
  return { revision: saved.revision };
}
