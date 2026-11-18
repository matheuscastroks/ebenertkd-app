import "server-only";

import { Query, type Models } from "node-appwrite";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import type { AppCapability } from "@/lib/auth/auth-utils";
import { getProfileById, readProfileById } from "@/features/profiles/profile-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";

type GuardianLink = Models.Row & {
  $id: string;
  guardian_profile_id: string;
  student_profile_id: string;
  status: "active" | "revoked";
};

export async function enableGuardianCapability(profile: Profile) {
  // Só adulto pode ser responsável: a interface esconde a opção, mas a action precisa recusar por conta própria.
  if (profile.role === "minor_student" || profile.role === "admin") throw new Error("guardian_not_allowed_for_role");
  if (profile.capabilities.includes("guardian")) return profile;
  const { tables, config } = createAppwriteAdminClient();
  const capabilities: AppCapability[] = [...profile.capabilities, "guardian"];
  const updated = await tables.updateRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: profile.$id,
    data: { capabilities, updated_at: new Date().toISOString() }
  });
  invalidateTags(CACHE_TAGS.profiles, CACHE_TAGS.profileAccount(profile.account_id), CACHE_TAGS.studentAccess);
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
  // O vínculo (acima) nunca é cacheado; só a linha do perfil de cada filho.
  return Promise.all(links.rows.map((link) => getProfileById(link.student_profile_id)));
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
  const minor = await readProfileById(minorProfileId);
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
