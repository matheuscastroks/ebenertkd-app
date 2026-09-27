import "server-only";

import { cookies } from "next/headers";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import type { Profile } from "@/features/auth/types";
import type { OnboardingPreferences } from "./types";

const COOKIE_NAME = "ebener_onboarding_completed";

export async function saveOnboarding(
  actor: Profile,
  preferences: OnboardingPreferences
): Promise<void> {
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: actor.$id,
    data: {
      onboarding_completed_at: now,
      onboarding_preferences: JSON.stringify({
        ...preferences,
        completedAt: now,
      }),
      updated_at: now,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function skipOnboarding(actor: Profile): Promise<void> {
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: actor.$id,
    data: {
      onboarding_completed_at: now,
      onboarding_preferences: JSON.stringify({
        skipped: true,
        completedAt: now,
      }),
      updated_at: now,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function resetOnboarding(actor: Profile): Promise<void> {
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();

  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: actor.$id,
    data: {
      onboarding_completed_at: null,
      onboarding_preferences: null,
      updated_at: now,
    },
  });

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function parsePreferences(profile: Profile): OnboardingPreferences | null {
  if (!profile.onboarding_preferences) return null;
  try {
    return JSON.parse(profile.onboarding_preferences) as OnboardingPreferences;
  } catch {
    return null;
  }
}
