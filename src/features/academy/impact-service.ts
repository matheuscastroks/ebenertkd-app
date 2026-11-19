import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { countEligibilityChange, countLockedStudents, type EligibilityImpact } from "@/features/academy/impact-rules";
import { applyRankChanges, planRankChanges, type RankPatch } from "@/features/academy/rank-changes";
import { RankValidationError } from "@/features/academy/rank-schemas";
import { buildEligibilityAssessments, loadEligibilityDataset } from "@/features/exams/eligibility-service";
import { parsePolicyInput } from "@/features/academy/schemas";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { saoPauloToday } from "@/lib/dates";

/**
 * "N alunos deixam de estar elegíveis e M passam a estar", com tempos/presenças/idade por graduação e/ou a política de
 * exame propostos. Somente leitura; só o administrador consulta.
 */
export async function previewEligibilityImpact(actor: Profile, input: { rankPatches?: RankPatch[]; examPatch?: Record<string, unknown> }): Promise<EligibilityImpact> {
  if (actor.role !== "admin") throw new Error("admin_required");
  const [dataset, ranks, exam] = await Promise.all([loadEligibilityDataset(), getBeltRanks(), getPolicy("exam")]);
  const { changes, issues } = planRankChanges(ranks, input.rankPatches ?? []);
  if (issues.length > 0) throw new RankValidationError(issues);
  const proposedExam = parsePolicyInput("exam", { ...exam, ...(input.examPatch ?? {}) });
  const referenceDate = saoPauloToday();
  const before = buildEligibilityAssessments(dataset, { ranks, exam }, referenceDate).assessments;
  const after = buildEligibilityAssessments(dataset, { ranks: applyRankChanges(ranks, changes), exam: proposedExam }, referenceDate).assessments;
  return countEligibilityChange(before, after);
}

export type AccessImpact = { total: number; lockedNow: number; lockedProposed: number };

/** "N alunos ficariam bloqueados hoje com a nova janela". Somente leitura; só o administrador consulta. */
export async function previewAccessImpact(actor: Profile, patch: Record<string, unknown>): Promise<AccessImpact> {
  if (actor.role !== "admin") throw new Error("admin_required");
  const current = await getPolicy("access");
  const proposed = parsePolicyInput("access", { ...current, ...patch });
  const [enrollments, charges, payments] = await Promise.all([
    listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments, [Query.equal("status", ["active", "awaiting_renewal"])]),
    listAllRows<Charge>(APPWRITE_IDS.tables.charges, [Query.equal("charge_type", ["monthly_fee"]), Query.notEqual("status", ["cancelled"])]),
    listAllRows<Payment>(APPWRITE_IDS.tables.payments, [Query.equal("status", ["confirmed"])])
  ]);
  const referenceDate = saoPauloToday();
  return {
    total: enrollments.length,
    lockedNow: countLockedStudents({ enrollments, charges, payments, policy: current, referenceDate }),
    lockedProposed: countLockedStudents({ enrollments, charges, payments, policy: proposed, referenceDate })
  };
}
