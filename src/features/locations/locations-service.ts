import "server-only";

import { AppwriteException, ID, Query, type Models } from "node-appwrite";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import { locationInputSchema, sortLocations, toTrainingLocation, type LocationRow } from "@/features/locations/locations-rules";
import type { TrainingLocation } from "@/features/locations/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { safeErrorMessage } from "@/lib/security/safe-error";

type DbRow = Models.Row & LocationRow;

function requireAdmin(actor: Profile) {
  if (actor.role !== "admin") throw new Error("admin_required");
}

const activeRows = () =>
  cachedRead({ name: "training-locations", key: [], tags: [CACHE_TAGS.trainingLocations], revalidate: 3600 }, async () => {
    const { tables, config } = createAppwriteAdminClient();
    const result = await tables.listRows<DbRow>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.trainingLocations,
      queries: [Query.equal("status", ["active"]), Query.limit(200)]
    });
    return result.rows.map(({ $id, name, address, complement, notes, is_default, status, created_at, $createdAt }) => ({ $id, name, address, complement, notes, is_default, status, created_at, $createdAt }));
  });

/** Locais ativos (padrão primeiro). Nunca lança: sem tabela ou com falha de leitura devolve lista vazia. */
export async function listLocations(): Promise<TrainingLocation[]> {
  try {
    return sortLocations((await activeRows()).map(toTrainingLocation));
  } catch (error) {
    console.error(`[locations] list_failed: ${safeErrorMessage(error)}`);
    return [];
  }
}

async function listActiveFresh(): Promise<DbRow[]> {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<DbRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingLocations, queries: [Query.equal("status", ["active"]), Query.limit(200)] });
  return result.rows;
}

/** Cria ou edita um local. Só o administrador. O primeiro local ativo vira o padrão; marcar outro como padrão tira a marca do anterior. */
export async function saveLocation(actor: Profile, raw: unknown): Promise<TrainingLocation> {
  requireAdmin(actor);
  const input = locationInputSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const active = await listActiveFresh();
  const existing = input.id ? active.find((row) => row.$id === input.id) : undefined;
  if (input.id && !existing) throw new Error("location_not_found");

  const makeDefault = input.is_default === true || (active.length === 0) || (existing?.is_default === true && input.is_default !== false);
  const data = {
    name: input.name,
    address: input.address ?? null,
    complement: input.complement ?? null,
    notes: input.notes ?? null,
    is_default: makeDefault,
    updated_by_account_id: actor.account_id,
    updated_at: now
  };
  let saved: DbRow;
  try {
    saved = existing
      ? await tables.updateRow<DbRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingLocations, rowId: existing.$id, data })
      : await tables.createRow<DbRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingLocations, rowId: ID.unique(), data: { ...data, status: "active", created_at: now }, permissions: [] });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) throw new Error("location_not_found");
    throw error;
  }
  if (makeDefault) {
    for (const other of active.filter((row) => row.$id !== saved.$id && row.is_default === true)) {
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingLocations, rowId: other.$id, data: { is_default: false, updated_by_account_id: actor.account_id, updated_at: now } });
    }
  }
  invalidateTags(CACHE_TAGS.trainingLocations);
  // Auditoria sem endereço nem texto livre: só o identificador e o tipo da operação.
  await writeAuditEvent(existing ? "training_location.updated" : "training_location.created", actor.account_id, "training_location", saved.$id, { is_default: makeDefault });
  return toTrainingLocation({ ...saved, status: "active" });
}

/** Arquiva o local (some das sugestões; turmas existentes guardam só o nome e não mudam). O local padrão não pode ser removido. */
export async function deleteLocation(actor: Profile, id: string): Promise<boolean> {
  requireAdmin(actor);
  const active = await listActiveFresh();
  const target = active.find((row) => row.$id === id);
  if (!target) return false;
  if (target.is_default === true) throw new Error("default_location");
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingLocations, rowId: id, data: { status: "archived", updated_by_account_id: actor.account_id, updated_at: new Date().toISOString() } });
  invalidateTags(CACHE_TAGS.trainingLocations);
  await writeAuditEvent("training_location.archived", actor.account_id, "training_location", id, {});
  return true;
}
