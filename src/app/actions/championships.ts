"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { confirmChampionshipRegistration, recordEventResult, setFederationSubmission, updateDeclaredWeight } from "@/features/events/championship-service";
import { sendEventDeadlineReminders } from "@/features/events/deadline-reminders";
import { safeEventReturnPath, withQuery } from "@/features/events/paths";
import { reviewRegistrationDocument, uploadRegistrationDocument } from "@/features/events/registration-documents-service";
import { approveRegistration } from "@/features/events/registration-service";
import { parseWeightKgToGrams } from "@/features/events/schemas";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

function errorCode(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "invalid";
  return error instanceof Error ? error.message : "unknown";
}

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Professora confirma o atleta na equipe do campeonato (cria as cobranças da academia e da federação). */
export async function confirmChampionshipAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = { ok: "team_confirmed" };
  try {
    await confirmChampionshipRegistration(admin, String(formData.get("registration_id") ?? ""), { force: formData.get("force") === "on" });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "inscritos" }));
}

/** Marca atletas como enviados à federação (um ou vários, pelos `registration_id` do formulário). */
export async function submitToFederationAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  const ids = formData.getAll("registration_id").map(String).filter(Boolean);
  const submitted = formData.get("submitted") !== "0";
  let query: Record<string, string> = { ok: submitted ? "submitted" : "submission_undone" };
  try {
    const { skipped } = await setFederationSubmission(admin, { registrationIds: ids, submitted });
    if (skipped.length) query = { ok: "bulk_partial" };
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "inscritos" }));
}

/** Peso declarado: aluno adulto, responsável ou professora, até o prazo de troca de categoria. */
export async function updateWeightAction(formData: FormData) {
  const actor = await requireProfile();
  const returnTo = safeEventReturnPath(formData.get("return_to"));
  let query: Record<string, string> = { ok: "weight" };
  try {
    const grams = parseWeightKgToGrams(str(formData, "weight_kg"));
    await updateDeclaredWeight(actor, { registrationId: String(formData.get("registration_id") ?? ""), declaredWeightGrams: grams ?? undefined });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

export async function recordResultAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = { ok: "result" };
  try {
    await recordEventResult(admin, { registrationId: String(formData.get("registration_id") ?? ""), medal: String(formData.get("medal") ?? "none"), placement: str(formData, "placement"), notes: str(formData, "notes"), absent: formData.get("absent") === "1" });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "resultados" }));
}

/** Anexa autorização assinada, termo, atestado ou carteira da federação à inscrição. */
export async function uploadRegistrationDocumentAction(formData: FormData) {
  const actor = await requireProfile();
  const returnTo = safeEventReturnPath(formData.get("return_to"));
  let query: Record<string, string> = { ok: "document" };
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("document_file_required");
    await uploadRegistrationDocument(actor, String(formData.get("registration_id") ?? ""), String(formData.get("kind") ?? ""), file);
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

/** Aprova ou recusa documentos (um ou vários). Recusar exige o motivo. */
export async function reviewRegistrationDocumentAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  const ids = formData.getAll("document_id").map(String).filter(Boolean);
  const decision = formData.get("decision") === "rejected" ? "rejected" : "approved";
  let query: Record<string, string> = ids.length ? { ok: decision === "approved" ? "document_approved" : "document_rejected" } : { erro: "bulk_empty" };
  try {
    for (const id of ids) await reviewRegistrationDocument(admin, id, decision, str(formData, "reason"));
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "documentos" }));
}

export async function sendDeadlineRemindersAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = { ok: "reminders" };
  try {
    await sendEventDeadlineReminders(admin);
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

async function runBulk(ids: string[], run: (id: string) => Promise<unknown>) {
  let failures = 0;
  for (const id of ids) {
    try {
      await run(id);
    } catch {
      failures += 1;
    }
  }
  return failures;
}

function bulkQuery(total: number, failures: number): Record<string, string> {
  if (total === 0) return { erro: "bulk_empty" };
  return { ok: failures === 0 ? "bulk" : "bulk_partial" };
}

/** Central de inscrições: aprova várias inscrições pendentes de uma vez. */
export async function bulkApproveAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  const ids = formData.getAll("registration_id").map(String).filter(Boolean);
  const failures = await runBulk(ids, (id) => approveRegistration(admin, id));
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, bulkQuery(ids.length, failures)));
}

/** Central de inscrições: confirma vários atletas na equipe do campeonato. */
export async function bulkConfirmTeamAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  const ids = formData.getAll("registration_id").map(String).filter(Boolean);
  const failures = await runBulk(ids, (id) => confirmChampionshipRegistration(admin, id));
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, bulkQuery(ids.length, failures)));
}
