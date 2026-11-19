"use server";

import { revalidatePath } from "next/cache";
import type { Profile } from "@/features/auth/types";
import { savePolicySection, saveAcademyIdentity } from "@/features/academy/config-admin-service";
import type { PolicySection } from "@/features/academy/defaults";
import { accessFormToPatch, billingFormToPatch, contractFormToPatch, identityFormToInput } from "@/features/academy/form-input";
import { previewAccessImpact, type AccessImpact } from "@/features/academy/impact-service";
import { PolicyValidationError } from "@/features/academy/schemas";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { ZodError } from "zod";

export type AcademySaveResult =
  | { ok: true; revision: number }
  | { ok: false; error: "revision_conflict" | "invalid" | "failed"; fields?: Record<string, string> };

function failure(error: unknown): AcademySaveResult {
  if (error instanceof Error && error.message === "revision_conflict") return { ok: false, error: "revision_conflict" };
  if (error instanceof PolicyValidationError) {
    return { ok: false, error: "invalid", fields: Object.fromEntries(error.issues.map((issue) => [issue.field, issue.message])) };
  }
  if (error instanceof ZodError) {
    return { ok: false, error: "invalid", fields: Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])) };
  }
  console.error(`[academy-settings] ${safeErrorMessage(error)}`);
  return { ok: false, error: "failed" };
}

const expectedRevision = (formData: FormData) => {
  const value = Number(formData.get("revision") ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
};

const reasonOf = (formData: FormData) => String(formData.get("reason") ?? "").trim() || undefined;

async function savePolicy(section: PolicySection, patch: Record<string, unknown>, formData: FormData, actor: Profile, paths: string[]): Promise<AcademySaveResult> {
  try {
    const saved = await savePolicySection(actor, section, patch, expectedRevision(formData), reasonOf(formData));
    for (const path of paths) revalidatePath(path);
    return { ok: true, revision: saved.revision };
  } catch (error) {
    return failure(error);
  }
}

export async function saveAcademyIdentityAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  try {
    const saved = await saveAcademyIdentity(actor, identityFormToInput(formData), expectedRevision(formData), reasonOf(formData));
    revalidatePath("/", "layout");
    return { ok: true, revision: saved.revision };
  } catch (error) {
    return failure(error);
  }
}

export async function saveBillingPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("billing", billingFormToPatch(formData), formData, actor, [ROUTES.adminAcademyFinance, ROUTES.adminAcademy, "/", ROUTES.adminBillingAdjustment]);
}

export async function saveAccessPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("access", accessFormToPatch(formData), formData, actor, [ROUTES.adminAcademyFinance, ROUTES.adminAcademy]);
}

export async function saveContractPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("contract", contractFormToPatch(formData), formData, actor, [ROUTES.adminAcademyContracts, ROUTES.adminAcademy]);
}

export async function previewAccessImpactAction(formData: FormData): Promise<{ ok: true; impact: AccessImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewAccessImpact(actor, accessFormToPatch(formData)) };
  } catch {
    return { ok: false };
  }
}
