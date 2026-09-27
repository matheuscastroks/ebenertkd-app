import "server-only";

import { Query, Models } from "node-appwrite";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import type { Profile } from "./types";

export async function deleteSelfAccount(actor: Profile): Promise<{ success: boolean }> {
  if (actor.role === "admin") {
    throw new Error("cannot_delete_admin_account");
  }

  const { users, tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  // 1. Delete user from Appwrite Auth (invalidates all sessions immediately)
  try {
    await users.delete(actor.account_id);
  } catch (err) {
    console.warn(`[account-deletion] Auth user deletion warning for ${actor.account_id}:`, err);
  }

  // 2. Anonymize and disable Profile in database
  const anonymizedEmail = `deleted_${actor.$id.slice(0, 8)}_${Date.now()}@removido.local`;
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: actor.$id,
    data: {
      status: "disabled",
      email: anonymizedEmail,
      username: null,
      updated_at: now,
    },
  });

  // 3. Revoke any guardian links involving this profile
  try {
    const guardianLinks = await tables.listRows<Models.Row>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.guardianStudentLinks,
      queries: [
        Query.or([
          Query.equal("guardian_profile_id", [actor.$id]),
          Query.equal("student_profile_id", [actor.$id]),
        ]),
        Query.limit(50),
      ],
    });

    for (const link of guardianLinks.rows) {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.guardianStudentLinks,
        rowId: link.$id,
        data: {
          status: "revoked",
          updated_at: now,
        },
      });
    }
  } catch (err) {
    console.warn("[account-deletion] Error revoking guardian links:", err);
  }

  // 4. Update student record if exists
  try {
    const studentRows = await tables.listRows<Models.Row>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.students,
      queries: [Query.equal("profile_id", [actor.$id]), Query.limit(1)],
    });

    if (studentRows.rows[0]) {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.students,
        rowId: studentRows.rows[0].$id,
        data: {
          status: "inactive",
          whatsapp: "",
          emergency_contact_phone: "",
          updated_at: now,
        },
      });
    }
  } catch (err) {
    console.warn("[account-deletion] Error disabling student record:", err);
  }

  return { success: true };
}

export async function deleteStudentAccount(
  admin: Profile,
  targetProfileId: string
): Promise<{ success: boolean }> {
  if (admin.role !== "admin") {
    throw new Error("forbidden");
  }

  if (admin.$id === targetProfileId) {
    throw new Error("cannot_delete_admin_account");
  }

  const { users, tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  // 1. Fetch target profile
  const target = await tables.getRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: targetProfileId,
  });

  if (!target) {
    throw new Error("profile_not_found");
  }

  if (target.role === "admin") {
    throw new Error("cannot_delete_admin_account");
  }

  // 2. Delete user from Appwrite Auth
  try {
    await users.delete(target.account_id);
  } catch (err) {
    console.warn(`[account-deletion] Auth user deletion warning for ${target.account_id}:`, err);
  }

  // 3. Anonymize and disable Profile in database
  const anonymizedEmail = `deleted_${target.$id.slice(0, 8)}_${Date.now()}@removido.local`;
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: target.$id,
    data: {
      status: "disabled",
      email: anonymizedEmail,
      username: null,
      updated_at: now,
    },
  });

  // 4. Revoke guardian links
  try {
    const guardianLinks = await tables.listRows<Models.Row>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.guardianStudentLinks,
      queries: [
        Query.or([
          Query.equal("guardian_profile_id", [target.$id]),
          Query.equal("student_profile_id", [target.$id]),
        ]),
        Query.limit(50),
      ],
    });

    for (const link of guardianLinks.rows) {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.guardianStudentLinks,
        rowId: link.$id,
        data: {
          status: "revoked",
          updated_at: now,
        },
      });
    }
  } catch (err) {
    console.warn("[account-deletion] Error revoking guardian links:", err);
  }

  // 5. Inactivate student record
  try {
    const studentRows = await tables.listRows<Models.Row>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.students,
      queries: [Query.equal("profile_id", [target.$id]), Query.limit(1)],
    });

    if (studentRows.rows[0]) {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.students,
        rowId: studentRows.rows[0].$id,
        data: {
          status: "inactive",
          whatsapp: "",
          emergency_contact_phone: "",
          updated_at: now,
        },
      });
    }
  } catch (err) {
    console.warn("[account-deletion] Error disabling student record:", err);
  }

  return { success: true };
}
