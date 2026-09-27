import "server-only";

import { cache } from "react";
import { Query } from "node-appwrite";
import { redirect } from "next/navigation";
import type { AppCapability, AppRole } from "@/lib/auth/auth-utils";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteSessionClient } from "@/lib/appwrite/session";
import type { Profile } from "@/features/auth/types";
import { hasCapability } from "@/features/auth/permissions";

export type ProfileRecord = Profile;

export const getCurrentProfile = cache(async function getCurrentProfile() {
  const appwrite = await createAppwriteSessionClient();
  if (!appwrite) return null;

  try {
    const account = await appwrite.account.get();
    const result = await appwrite.tables.listRows<Profile>({
      databaseId: APPWRITE_IDS.database,
      tableId: APPWRITE_IDS.tables.profiles,
      queries: [Query.equal("account_id", [account.$id]), Query.limit(1)]
    });
    const profile = result.rows[0] ?? null;
    return profile?.status === "active" ? profile : null;
  } catch {
    return null;
  }
});

export async function requireProfile(role?: AppRole) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/?error=unauthorized");
  if (role && profile.role !== role) redirect(resolveDashboardPath(profile.role));
  return profile;
}

export async function requireCapability(capability: AppCapability) {
  const profile = await requireProfile();
  if (!hasCapability(profile.capabilities, capability)) redirect(resolveDashboardPath(profile.role));
  return profile;
}
