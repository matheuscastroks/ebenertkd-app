"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { addExamParticipant, cancelExamEvent, cancelExamParticipant, createExamEvent, recordExamResult } from "@/features/exams/service";
import type { PaidChargeDecision } from "@/features/exams/rules";
import { requireProfile } from "@/lib/auth/session";
import { reaisToCents } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function createExamEventAction(formData: FormData) {
  const admin = await requireProfile("admin");
  let eventId: string;
  try {
    const event = await createExamEvent(admin, { name: formData.get("name"), eventDate: formData.get("event_date"), location: formData.get("location") || undefined, defaultFeeCents: reaisToCents(formData.get("default_fee_reais")) });
    eventId = event.$id;
  } catch {
    redirect(`${ROUTES.adminExams}?error=create`);
  }
  updateTag(CACHE_TAGS.examEvents);
  revalidatePath(ROUTES.adminExams);
  redirect(adminExamPath(eventId));
}

export async function addExamParticipantAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  try {
    await addExamParticipant(admin, { eventId, studentId: formData.get("student_id"), targetBelt: formData.get("target_belt"), targetGub: formData.get("target_gub"), feeCents: reaisToCents(formData.get("fee_reais")) });
  } catch {
    redirect(`${adminExamPath(eventId)}?error=participant`);
  }
  updateTag(CACHE_TAGS.examEvents);
  revalidatePath(adminExamPath(eventId));
  redirect(`${adminExamPath(eventId)}?added=1`);
}

export async function recordExamResultAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  try {
    await recordExamResult(admin, { participantId: formData.get("participant_id"), result: formData.get("result"), notes: formData.get("notes") || undefined });
  } catch {
    redirect(`${adminExamPath(eventId)}?error=result`);
  }
  updateTag(CACHE_TAGS.examEvents);
  revalidatePath(adminExamPath(eventId));
  redirect(`${adminExamPath(eventId)}?graded=1`);
}

export async function cancelExamParticipantAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  const decision = String(formData.get("financial_decision") ?? "") || undefined;
  try {
    await cancelExamParticipant(admin, String(formData.get("participant_id") ?? ""), decision as PaidChargeDecision | undefined);
  } catch {
    redirect(`${adminExamPath(eventId)}?error=cancel`);
  }
  updateTag(CACHE_TAGS.examEvents);
  revalidatePath(adminExamPath(eventId));
  redirect(`${adminExamPath(eventId)}?cancelled=1`);
}

export async function cancelExamEventAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  try {
    await cancelExamEvent(admin, eventId);
  } catch {
    redirect(`${adminExamPath(eventId)}?error=event-cancel`);
  }
  updateTag(CACHE_TAGS.examEvents);
  revalidatePath(ROUTES.adminExams);
  redirect(`${ROUTES.adminExams}?cancelled=1`);
}
