import "server-only";

import { ID, Permission, Query, Role } from "node-appwrite";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { createAppwriteAuthClient } from "@/lib/appwrite/session";
import { minorTechnicalEmail } from "@/lib/auth/auth-utils";
import type { AppCapability } from "@/lib/auth/auth-utils";
import type { AdultRegistration, MinorRegistration, Profile } from "@/features/auth/types";
import { capabilitiesByRole } from "@/features/auth/permissions";

export class AuthServiceError extends Error {
  constructor(public readonly code: "invalid_credentials" | "account_unavailable" | "registration_failed") {
    super(code);
  }
}

const minorLoginAttempts = new Map<string, { count: number; resetAt: number }>();

export function assertMinorLoginAllowed(key: string) {
  const now = Date.now();
  const attempt = minorLoginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    minorLoginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return;
  }
  attempt.count += 1;
  if (attempt.count > 5) throw new AuthServiceError("invalid_credentials");
}

export function clearMinorLoginAttempts(key: string) {
  minorLoginAttempts.delete(key);
}

function profilePermissions(accountId: string) {
  return [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))];
}

export async function writeAuditEvent(
  eventType: string,
  actorAccountId?: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const { tables, config } = createAppwriteAdminClient();
  await tables.createRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.auditEvents,
    rowId: ID.unique(),
    data: {
      actor_account_id: actorAccountId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      created_at: new Date().toISOString()
    },
    permissions: []
  });
}

export async function createAdultAccount(input: AdultRegistration) {
  const { users, tables, config } = createAppwriteAdminClient();
  const accountId = ID.unique();
  const now = new Date().toISOString();
  const capabilities: AppCapability[] = capabilitiesByRole[input.accountType];

  try {
    await users.create({
      userId: accountId,
      email: input.email,
      password: input.password,
      name: input.fullName
    });
    const profile = await tables.createRow<Profile>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.profiles,
      rowId: ID.unique(),
      data: {
        account_id: accountId,
        full_name: input.fullName,
        email: input.email,
        role: input.accountType,
        capabilities,
        status: "active",
        created_at: now,
        updated_at: now
      },
      permissions: profilePermissions(accountId)
    });
    await writeAuditEvent("auth.account.created", accountId, "profile", profile.$id, {
      role: input.accountType
    }).catch(() => undefined);
    return profile;
  } catch (error) {
    try {
      await users.delete({ userId: accountId });
    } catch {
      // The account might not have been created.
    }
    throw new AuthServiceError("registration_failed");
  }
}

export async function createMinorAccount(
  guardian: Profile,
  input: MinorRegistration
) {
  const { users, tables, config } = createAppwriteAdminClient();
  const accountId = ID.unique();
  const now = new Date().toISOString();
  const email = minorTechnicalEmail(input.username);

  try {
    await users.create({ userId: accountId, email, password: input.password, name: input.fullName });
    const minor = await tables.createRow<Profile>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.profiles,
      rowId: ID.unique(),
      data: {
        account_id: accountId,
        full_name: input.fullName,
        email,
        username: input.username,
        role: "minor_student",
        capabilities: ["student"],
        status: "active",
        created_at: now,
        updated_at: now
      },
      permissions: profilePermissions(accountId)
    });
    await tables.createRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.guardianStudentLinks,
      rowId: ID.unique(),
      data: {
        guardian_profile_id: guardian.$id,
        student_profile_id: minor.$id,
        status: "active",
        created_by_account_id: guardian.account_id,
        created_at: now,
        updated_at: now
      },
      permissions: [
        Permission.read(Role.user(guardian.account_id)),
        Permission.update(Role.user(guardian.account_id))
      ]
    });
    await writeAuditEvent("family.minor.created", guardian.account_id, "profile", minor.$id).catch(() => undefined);
    return minor;
  } catch (error) {
    try {
      await users.delete({ userId: accountId });
    } catch {
      // The account might not have been created.
    }
    throw new AuthServiceError("registration_failed");
  }
}

export async function createEmailSession(email: string, password: string) {
  const { account } = createAppwriteAuthClient();
  try {
    return await account.createEmailPasswordSession({ email, password });
  } catch {
    throw new AuthServiceError("invalid_credentials");
  }
}

export async function resolveMinorEmail(username: string) {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [Query.equal("username", [username]), Query.equal("role", ["minor_student"]), Query.limit(1)]
  });
  const profile = result.rows[0];
  if (!profile || profile.status !== "active") throw new AuthServiceError("invalid_credentials");
  return profile.email;
}

export async function requestPasswordRecovery(email: string) {
  const { account, config } = createAppwriteAuthClient();
  try {
    await account.createRecovery({ email, url: `${config.appUrl}/recuperar/confirmar` });
  } catch {
    // Always return the same outcome to prevent account enumeration.
  }
}

export async function confirmPasswordRecovery(userId: string, secret: string, password: string) {
  const { account } = createAppwriteAuthClient();
  await account.updateRecovery({ userId, secret, password });
}

export async function promoteMinorToAdult(
  minorProfileId: string,
  email: string,
  actorAccountId: string,
  retainGuardianAccess: boolean
) {
  const { users, tables, config } = createAppwriteAdminClient();
  const minor = await tables.getRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: minorProfileId
  });
  if (minor.role !== "minor_student") throw new Error("profile_is_not_minor");
  await users.updateEmail({ userId: minor.account_id, email });
  await users.deleteSessions({ userId: minor.account_id });
  await tables.updateRow<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: minor.$id,
    data: {
      email,
      username: null,
      role: "adult_student",
      capabilities: ["student"],
      updated_at: new Date().toISOString()
    }
  });
  if (!retainGuardianAccess) {
    const links = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.guardianStudentLinks,
      queries: [Query.equal("student_profile_id", [minor.$id]), Query.equal("status", ["active"])]
    });
    await Promise.all(links.rows.map((link) => tables.updateRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.guardianStudentLinks,
      rowId: link.$id,
      data: { status: "revoked", updated_at: new Date().toISOString() }
    })));
  }
  await requestPasswordRecovery(email);
  await writeAuditEvent("auth.minor.promoted", actorAccountId, "profile", minor.$id, {
    email,
    retain_guardian_access: retainGuardianAccess
  });
}
