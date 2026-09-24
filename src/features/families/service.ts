import "server-only";

import { Query, type Models } from "node-appwrite";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import type { AppCapability } from "@/lib/auth/auth-utils";

type GuardianLink = Models.Row & {
  $id: string;
  guardian_profile_id: string;
  student_profile_id: string;
  status: "active" | "revoked";
};

export async function enableGuardianCapability(profile: Profile) {
  if (profile.capabilities.includes("guardian")) return profile;
  const { tables, config } = createAppwriteAdminClient();
  const capabilities: AppCapability[] = [...profile.capabilities, "guardian"];
  const updated = await tables.updateRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: profile.$id,
    data: { capabilities, updated_at: new Date().toISOString() }
  });
  await writeAuditEvent("family.guardian.enabled", profile.account_id, "profile", profile.$id);
  return updated;
}

export async function listGuardianMinors(guardian: Profile) {
  const { tables, config } = createAppwriteAdminClient();
  const links = await tables.listRows<GuardianLink>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.guardianStudentLinks,
    queries: [
      Query.equal("guardian_profile_id", [guardian.$id]),
      Query.equal("status", ["active"]),
      Query.limit(100)
    ]
  });
  return Promise.all(links.rows.map((link) => tables.getRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: link.student_profile_id
  })));
}

async function requireOwnedMinor(guardian: Profile, minorProfileId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const links = await tables.listRows<GuardianLink>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.guardianStudentLinks,
    queries: [
      Query.equal("guardian_profile_id", [guardian.$id]),
      Query.equal("student_profile_id", [minorProfileId]),
      Query.equal("status", ["active"]),
      Query.limit(1)
    ]
  });
  if (!links.rows[0]) throw new Error("minor_not_linked");
  const minor = await tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: minorProfileId });
  if (minor.role !== "minor_student") throw new Error("credential_management_not_allowed");
  return minor;
}

export async function resetMinorPassword(guardian: Profile, minorProfileId: string, password: string) {
  const minor = await requireOwnedMinor(guardian, minorProfileId);
  const { users } = createAppwriteAdminClient();
  await users.updatePassword({ userId: minor.account_id, password });
  await users.deleteSessions({ userId: minor.account_id });
  await writeAuditEvent("family.minor.password_reset", guardian.account_id, "profile", minor.$id);
}

export async function revokeMinorSessions(guardian: Profile, minorProfileId: string) {
  const minor = await requireOwnedMinor(guardian, minorProfileId);
  const { users } = createAppwriteAdminClient();
  await users.deleteSessions({ userId: minor.account_id });
  await writeAuditEvent("family.minor.sessions_revoked", guardian.account_id, "profile", minor.$id);
}
