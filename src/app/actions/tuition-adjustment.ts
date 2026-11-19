"use server";

import { revalidatePath } from "next/cache";
import {
  applyTuitionAdjustment,
  cancelTuitionAdjustment,
  createTuitionAdjustment,
  markAdjustmentItemNotified,
  publishAdjustmentNotice
} from "@/features/billing/adjustment-service";
import { deleteFinanceScenario, saveFinanceScenario, type SavedScenario } from "@/features/billing/planning-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

/**
 * Todas as ações exigem `requireProfile("admin")` ANTES de qualquer leitura ou gravação e validam a
 * entrada com zod nos serviços. Respostas nunca carregam nomes, telefones ou valores individuais em erros.
 */
export type ActionFailure = { ok: false; error: string };

const GENERIC_ERROR: ActionFailure = { ok: false, error: "Não foi possível concluir a operação. Confira os dados e tente novamente." };

function failure(error: unknown): ActionFailure {
  const code = error instanceof Error ? error.message : "";
  if (code === "enrollment_not_eligible") return { ok: false, error: "Um dos alunos não está mais elegível para reajuste. Atualize a lista e tente de novo." };
  if (code === "notice_already_published") return { ok: false, error: "O aviso geral desta campanha já foi publicado." };
  if (code === "adjustment_not_applicable") return { ok: false, error: "Esta campanha não pode mais ser confirmada." };
  if (code === "adjustment_not_cancellable") return { ok: false, error: "Somente campanhas em rascunho podem ser canceladas." };
  return GENERIC_ERROR;
}

export async function saveFinanceScenarioAction(input: unknown): Promise<{ ok: true; scenario: SavedScenario } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    const scenario = await saveFinanceScenario(actor, input);
    revalidatePath(ROUTES.adminBillingCalculator);
    return { ok: true, scenario };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteFinanceScenarioAction(id: string): Promise<{ ok: true } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    await deleteFinanceScenario(actor, { id });
    revalidatePath(ROUTES.adminBillingCalculator);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveTuitionAdjustmentAction(input: unknown): Promise<{ ok: true; id: string } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    const { id } = await createTuitionAdjustment(actor, input);
    revalidatePath(ROUTES.adminBillingAdjustment);
    return { ok: true, id };
  } catch (error) {
    return failure(error);
  }
}

export async function applyTuitionAdjustmentAction(adjustmentId: string): Promise<{ ok: true; applied: number; skipped: number; alreadyApplied: boolean } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    const result = await applyTuitionAdjustment(actor, { adjustmentId });
    revalidatePath(ROUTES.adminBillingAdjustment);
    revalidatePath(`${ROUTES.adminBillingAdjustment}/${adjustmentId}`);
    revalidatePath(ROUTES.adminContractRenewals);
    return { ok: true, applied: result.applied, skipped: result.skipped, alreadyApplied: result.status === "already_applied" };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelTuitionAdjustmentAction(adjustmentId: string): Promise<{ ok: true } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    await cancelTuitionAdjustment(actor, { adjustmentId });
    revalidatePath(ROUTES.adminBillingAdjustment);
    revalidatePath(`${ROUTES.adminBillingAdjustment}/${adjustmentId}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function markAdjustmentNotifiedAction(adjustmentId: string, enrollmentId: string, notified: boolean): Promise<{ ok: true; notifiedAt: string | null } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    const { notifiedAt } = await markAdjustmentItemNotified(actor, { adjustmentId, enrollmentId, notified });
    return { ok: true, notifiedAt };
  } catch (error) {
    return failure(error);
  }
}

export async function publishAdjustmentNoticeAction(adjustmentId: string): Promise<{ ok: true } | ActionFailure> {
  const actor = await requireProfile("admin");
  try {
    await publishAdjustmentNotice(actor, { adjustmentId });
    revalidatePath(`${ROUTES.adminBillingAdjustment}/${adjustmentId}`);
    revalidatePath(ROUTES.notifications);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
