import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { AppCapability, AppRole } from "@/lib/auth/auth-utils";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { createAppwriteSessionClient } from "@/lib/appwrite/session";
import type { Profile } from "@/features/auth/types";
import { hasCapability } from "@/features/auth/permissions";
import { readProfileByAccountId } from "@/features/profiles/profile-read";

export type ProfileRecord = Profile;

/**
 * Sessão e campos de autorização são relidos a cada requisição: logout, desativação,
 * alteração de papel e revogação de capacidade não dependem da invalidação do cache.
 * `cache` do React só deduplica chamadas dentro da mesma renderização no servidor.
 */
export const getCurrentProfile = cache(async function getCurrentProfile() {
  const appwrite = await createAppwriteSessionClient();
  if (!appwrite) return null;

  try {
    const account = await appwrite.account.get();
    const profile = await readProfileByAccountId(account.$id);
    if (!profile || profile.account_id !== account.$id) return null;
    return profile.status === "active" ? profile : null;
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
