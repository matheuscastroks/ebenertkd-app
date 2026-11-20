"use server";

import { revalidatePath } from "next/cache";
import type { Profile } from "@/features/auth/types";
import { applyBeltPreset, completeSetup, restoreConfigRevision, savePolicySection, saveAcademyIdentity, saveBeltRanks } from "@/features/academy/config-admin-service";
import type { PolicySection } from "@/features/academy/defaults";
import {
  accessFormToPatch,
  beltsFormToPatch,
  billingFormToPatch,
  complianceFormToPatch,
  contractFormToPatch,
  examFormToPatch,
  gamificationFormToPatch,
  identityFormToInput,
  notificationsFormToPatch,
  retentionFormToPatch
} from "@/features/academy/form-input";
import type { EligibilityImpact } from "@/features/academy/impact-rules";
import {
  previewAccessImpact,
  previewComplianceImpact,
  previewEligibilityImpact,
  previewRetentionImpact,
  type AccessImpact,
  type ComplianceImpact,
  type RetentionImpact
} from "@/features/academy/impact-service";
import { RankInUseError, type RankPatch } from "@/features/academy/rank-changes";
import { RankValidationError } from "@/features/academy/rank-schemas";
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

export async function saveRetentionPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("retention", retentionFormToPatch(formData), formData, actor, [ROUTES.adminAcademyRules, ROUTES.adminAcademy, ROUTES.adminRetention]);
}

export async function saveCompliancePolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("compliance", complianceFormToPatch(formData), formData, actor, [ROUTES.adminAcademyRules, ROUTES.adminAcademy, ROUTES.adminCompliance, ROUTES.studentParq, ROUTES.studentCard]);
}

export async function saveNotificationsPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("notifications", notificationsFormToPatch(formData), formData, actor, [ROUTES.adminAcademyRules, ROUTES.adminAcademy]);
}

export async function saveGamificationPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("gamification", gamificationFormToPatch(formData), formData, actor, [ROUTES.adminAcademyRules, ROUTES.adminAcademy, ROUTES.studentAchievements]);
}

export async function previewComplianceImpactAction(formData: FormData): Promise<{ ok: true; impact: ComplianceImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewComplianceImpact(actor, complianceFormToPatch(formData)) };
  } catch {
    return { ok: false };
  }
}

export async function previewRetentionImpactAction(formData: FormData): Promise<{ ok: true; impact: RetentionImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewRetentionImpact(actor, retentionFormToPatch(formData)) };
  } catch {
    return { ok: false };
  }
}

export async function previewAccessImpactAction(formData: FormData): Promise<{ ok: true; impact: AccessImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewAccessImpact(actor, accessFormToPatch(formData)) };
  } catch {
    return { ok: false };
  }
}

export async function saveExamPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("exam", examFormToPatch(formData), formData, actor, [ROUTES.adminAcademyExams, ROUTES.adminAcademy, ROUTES.adminExamEligibility, ROUTES.adminExams]);
}

export async function saveBeltsPolicyAction(formData: FormData): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  return savePolicy("belts", beltsFormToPatch(formData), formData, actor, [ROUTES.adminAcademyGrades, ROUTES.adminAcademy]);
}

export async function previewExamImpactAction(formData: FormData): Promise<{ ok: true; impact: EligibilityImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewEligibilityImpact(actor, { examPatch: examFormToPatch(formData) }) };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ graduações */

export type RankSaveResult =
  | { ok: true; changed: number }
  | { ok: false; error: "revision_conflict" | "invalid" | "rank_in_use" | "failed"; fields?: Record<string, string>; inUse?: string[] };

function rankFailure(error: unknown): RankSaveResult {
  if (error instanceof Error && error.message === "revision_conflict") return { ok: false, error: "revision_conflict" };
  if (error instanceof RankInUseError) return { ok: false, error: "rank_in_use", inUse: error.ranks.map((rank) => rank.rank_key) };
  if (error instanceof RankValidationError) {
    return { ok: false, error: "invalid", fields: Object.fromEntries(error.issues.map((issue) => [issue.rank_key ? `${issue.rank_key}.${issue.field}` : issue.field, issue.message])) };
  }
  console.error(`[academy-ranks] ${safeErrorMessage(error)}`);
  return { ok: false, error: "failed" };
}

function revalidateRankPages() {
  revalidatePath("/", "layout");
  revalidatePath(ROUTES.adminAcademyGrades);
  revalidatePath(ROUTES.adminAcademy);
}

/** Salva as alterações de graduações. Recebe só as graduações alteradas, cada uma com a revisão que o professor viu. */
export async function saveBeltRanksAction(patches: RankPatch[], reason?: string): Promise<RankSaveResult> {
  const actor = await requireProfile("admin");
  try {
    const result = await saveBeltRanks(actor, patches, reason?.trim() || undefined);
    revalidateRankPages();
    return { ok: true, changed: result.changed };
  } catch (error) {
    return rankFailure(error);
  }
}

export async function applyBeltPresetAction(presetId: string): Promise<RankSaveResult> {
  const actor = await requireProfile("admin");
  try {
    const result = await applyBeltPreset(actor, presetId);
    revalidateRankPages();
    return { ok: true, changed: result.changed };
  } catch (error) {
    return rankFailure(error);
  }
}

export async function previewRankImpactAction(patches: RankPatch[]): Promise<{ ok: true; impact: EligibilityImpact } | { ok: false }> {
  const actor = await requireProfile("admin");
  try {
    return { ok: true, impact: await previewEligibilityImpact(actor, { rankPatches: patches }) };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ histórico e assistente */

export type RestoreResult = { ok: true } | { ok: false; error: "revision_conflict" | "invalid" | "failed" };

/** Restaura uma versão do histórico (gera nova revisão). `expectedRevision` = revisão mais recente da seção que a tela mostrou. */
export async function restoreConfigRevisionAction(revisionId: string, expectedRevision: number): Promise<RestoreResult> {
  const actor = await requireProfile("admin");
  try {
    await restoreConfigRevision(actor, String(revisionId), Number.isInteger(expectedRevision) && expectedRevision >= 0 ? expectedRevision : 0);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "revision_conflict") return { ok: false, error: "revision_conflict" };
    if (error instanceof PolicyValidationError || error instanceof RankValidationError || error instanceof ZodError || (error instanceof Error && ["revision_not_found", "revision_not_restorable", "invalid_policy_section"].includes(error.message))) {
      return { ok: false, error: "invalid" };
    }
    console.error(`[academy-history] ${safeErrorMessage(error)}`);
    return { ok: false, error: "failed" };
  }
}

export async function completeSetupAction(): Promise<{ ok: true } | { ok: false; error: "identity_required" | "failed" }> {
  const actor = await requireProfile("admin");
  try {
    await completeSetup(actor);
    revalidatePath(ROUTES.admin);
    revalidatePath(ROUTES.adminAcademy);
    revalidatePath(ROUTES.adminAcademySetup);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "identity_required") return { ok: false, error: "identity_required" };
    console.error(`[academy-setup] ${safeErrorMessage(error)}`);
    return { ok: false, error: "failed" };
  }
}

/** Atalho das ferramentas financeiras: muda só a mensalidade padrão (gera uma revisão da seção `billing`). */
export async function saveDefaultMonthlyFeeAction(cents: number, expectedRevisionValue: number): Promise<AcademySaveResult> {
  const actor = await requireProfile("admin");
  try {
    const saved = await savePolicySection(actor, "billing", { default_monthly_fee_cents: cents }, Number.isInteger(expectedRevisionValue) && expectedRevisionValue >= 0 ? expectedRevisionValue : 0, "Mensalidade padrão atualizada pelas ferramentas financeiras");
    for (const path of [ROUTES.adminAcademyFinance, ROUTES.adminAcademy, ROUTES.adminBillingCalculator, ROUTES.adminBillingAdjustment]) revalidatePath(path);
    return { ok: true, revision: saved.revision };
  } catch (error) {
    return failure(error);
  }
}
