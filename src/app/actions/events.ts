"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { cancelEvent, completeEvent, createEvent, setEventStatus } from "@/features/events/event-service";
import { eventErrorMessage } from "@/features/events/labels";
import { safeEventReturnPath, withQuery } from "@/features/events/paths";
import { approveRegistration, cancelRegistration, confirmInterest, registerForEvent, rejectRegistration, setCheckIn } from "@/features/events/registration-service";
import { EVENT_STATUSES, type EventStatus } from "@/features/events/types";
import { requireProfile } from "@/lib/auth/session";
import { adminEventPath, ROUTES } from "@/lib/navigation/routes";

function errorCode(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "invalid";
  return error instanceof Error ? error.message : "unknown";
}

export type CreateEventResult = { ok: true; eventId: string } | { ok: false; error: string };

/** Assistente de criação: o cliente envia o evento inteiro (dinheiro já em centavos). */
export async function createEventAction(payload: unknown): Promise<CreateEventResult> {
  const admin = await requireProfile("admin");
  try {
    const event = await createEvent(admin, payload);
    revalidatePath(ROUTES.adminEvents);
    return { ok: true, eventId: event.$id };
  } catch (error) {
    const code = errorCode(error);
    return { ok: false, error: error instanceof ZodError ? code : eventErrorMessage(code) };
  }
}

export async function setEventStatusAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  const status = String(formData.get("status") ?? "") as EventStatus;
  let query: Record<string, string> = { ok: "status" };
  try {
    if (!EVENT_STATUSES.includes(status)) throw new Error("event_invalid_transition");
    await setEventStatus(admin, eventId, status);
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(adminEventPath(eventId));
  redirect(withQuery(adminEventPath(eventId), query));
}

export async function completeEventAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  let query: Record<string, string> = { ok: "completed" };
  try {
    await completeEvent(admin, eventId);
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(adminEventPath(eventId));
  redirect(withQuery(adminEventPath(eventId), query));
}

export async function cancelEventAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const eventId = String(formData.get("event_id") ?? "");
  let query: Record<string, string> = { ok: "cancelled" };
  try {
    await cancelEvent(admin, { eventId, reason: formData.get("reason"), decision: String(formData.get("financial_decision") ?? "") || undefined });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(adminEventPath(eventId));
  revalidatePath(ROUTES.adminEvents);
  redirect(withQuery(adminEventPath(eventId), query));
}

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Inscrição de aluno, dependente ou convidado. Qualquer perfil autenticado; o serviço decide quem pode agir sobre quem. */
export async function registerForEventAction(formData: FormData) {
  const actor = await requireProfile();
  const returnTo = safeEventReturnPath(formData.get("return_to"));
  let query: Record<string, string> = { ok: "registered" };
  try {
    const registration = await registerForEvent(actor, {
      eventId: str(formData, "event_id"),
      optionId: str(formData, "option_id"),
      studentProfileId: str(formData, "student_profile_id"),
      companions: str(formData, "companions") ?? "0",
      guestName: str(formData, "guest_name"),
      guestContact: str(formData, "guest_contact"),
      acceptedTerms: formData.get("accepted_terms") === "on",
      notes: str(formData, "notes")
    });
    query = { ok: registration.status === "waitlisted" ? "waitlisted" : registration.status === "interested" ? "interested" : registration.status === "pending_approval" ? "pending" : "registered" };
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

export async function cancelRegistrationAction(formData: FormData) {
  const actor = await requireProfile();
  const returnTo = safeEventReturnPath(formData.get("return_to"));
  let query: Record<string, string> = { ok: "cancelled" };
  try {
    await cancelRegistration(actor, { registrationId: str(formData, "registration_id"), decision: str(formData, "financial_decision") });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

export async function confirmInterestAction(formData: FormData) {
  const actor = await requireProfile();
  const returnTo = safeEventReturnPath(formData.get("return_to"));
  let query: Record<string, string> = { ok: "registered" };
  try {
    await confirmInterest(actor, String(formData.get("registration_id") ?? ""));
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, query));
}

export async function approveRegistrationAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = { ok: "approved" };
  try {
    await approveRegistration(admin, String(formData.get("registration_id") ?? ""));
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "inscritos" }));
}

export async function rejectRegistrationAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = { ok: "rejected" };
  try {
    await rejectRegistration(admin, { registrationId: str(formData, "registration_id"), decision: str(formData, "financial_decision") });
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "inscritos" }));
}

export async function checkInAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const returnTo = safeEventReturnPath(formData.get("return_to"), ROUTES.adminEvents);
  let query: Record<string, string> = {};
  try {
    await setCheckIn(admin, String(formData.get("registration_id") ?? ""), formData.get("present") !== "0");
  } catch (error) {
    query = { erro: errorCode(error) };
  }
  revalidatePath(returnTo);
  redirect(withQuery(returnTo, { ...query, aba: "checkin" }));
}
