import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { trainingClassSchema } from "@/features/classes/schemas";
import type { TrainingClass } from "@/features/classes/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function listTrainingClasses(includeInactive = false) {
  const { tables, config } = createAppwriteAdminClient();
  const queries = [Query.orderAsc("name"), Query.limit(100)];
  if (!includeInactive) queries.push(Query.equal("status", ["active"]));
  const result = await tables.listRows<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, queries });
  return result.rows;
}

export async function getTrainingClass(classId: string) {
  const { tables, config } = createAppwriteAdminClient();
  return tables.getRow<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: classId });
}

export async function createTrainingClass(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = trainingClassSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const row = await tables.createRow<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: ID.unique(), permissions: [], data: { name: input.name, weekdays: input.weekdays, start_time: input.startTime, end_time: input.endTime, location: input.location, capacity: input.capacity, status: "active", created_by_account_id: actor.account_id, created_at: now, updated_at: now } });
  await writeAuditEvent("training_class.created", actor.account_id, "training_class", row.$id);
  return row;
}

export async function updateTrainingClass(actor: Profile, classId: string, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = trainingClassSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: classId, data: { name: input.name, weekdays: input.weekdays, start_time: input.startTime, end_time: input.endTime, location: input.location, capacity: input.capacity, updated_at: new Date().toISOString() } });
  await writeAuditEvent("training_class.updated", actor.account_id, "training_class", classId);
}

export async function setTrainingClassStatus(actor: Profile, classId: string, status: "active" | "inactive") {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: classId, data: { status, updated_at: new Date().toISOString() } });
  await writeAuditEvent(`training_class.${status}`, actor.account_id, "training_class", classId);
}
