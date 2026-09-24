import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function resolveStudentProfile(actor: Profile, requestedProfileId?: string | null) {
  const targetId = requestedProfileId || actor.$id;
  const { tables, config } = createAppwriteAdminClient();
  const target = await tables.getRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: targetId
  });

  if (actor.role === "admin") return target;
  if (target.$id === actor.$id && actor.capabilities.includes("student")) return target;
  if (!actor.capabilities.includes("guardian")) throw new Error("student_access_denied");

  const links = await tables.listRows({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.guardianStudentLinks,
    queries: [
      Query.equal("guardian_profile_id", [actor.$id]),
      Query.equal("student_profile_id", [target.$id]),
      Query.equal("status", ["active"]),
      Query.limit(1)
    ]
  });
  if (!links.rows[0]) throw new Error("student_access_denied");
  return target;
}

export async function canAccessStudent(actor: Profile, studentProfileId: string) {
  try {
    await resolveStudentProfile(actor, studentProfileId);
    return true;
  } catch {
    return false;
  }
}
