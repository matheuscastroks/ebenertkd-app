import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { AppCapability, AppRole } from "@/lib/auth/auth-utils";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { createAppwriteSessionClient } from "@/lib/appwrite/session";
import type { Profile } from "@/features/auth/types";
import { hasCapability } from "@/features/auth/permissions";
import { getProfileByAccountId } from "@/features/profiles/profile-read";

export type ProfileRecord = Profile;

/**
 * `account.get()` roda a cada requisição, SEM cache: logout e revogação de sessão valem na hora.
 * Só a busca do perfil por `account_id` é cacheada (60 s, tag `profile-account:<id>`); o status
 * `active` e a conta dona da linha são conferidos aqui, fora do cache.
 */
export const getCurrentProfile = cache(async function getCurrentProfile() {
  const appwrite = await createAppwriteSessionClient();
  if (!appwrite) return null;

  try {
    const account = await appwrite.account.get();
    const profile = await getProfileByAccountId(account.$id);
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
