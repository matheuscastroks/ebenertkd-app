"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { resetOnboarding, saveOnboarding, skipOnboarding } from "@/features/onboarding/service";
import type { OnboardingPreferences } from "@/features/onboarding/types";

export async function saveOnboardingAction(preferences: OnboardingPreferences) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "unauthorized" };

  try {
    await saveOnboarding(profile, preferences);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to save onboarding:", error);
    return { error: "failed_to_save" };
  }
}

export async function skipOnboardingAction() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "unauthorized" };

  try {
    await skipOnboarding(profile);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to skip onboarding:", error);
    return { error: "failed_to_skip" };
  }
}

export async function resetOnboardingAction() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "unauthorized" };

  try {
    await resetOnboarding(profile);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset onboarding:", error);
    return { error: "failed_to_reset" };
  }
}
