"use server";

import { revalidatePath } from "next/cache";
import { checkInErrorMessage, type CheckInResultState } from "@/features/classes/check-in-labels";
import { CheckInError, checkInStudent, justifyAbsence } from "@/features/classes/check-in-service";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { safeErrorMessage } from "@/lib/security/safe-error";

function failure(error: unknown): CheckInResultState {
  if (error instanceof CheckInError) {
    return { status: "error", code: error.code, ...checkInErrorMessage(error.code, error.detail) };
  }
  // Só o código do erro: nunca a posição nem o texto da justificativa.
  console.error(`[check-in] failed: ${safeErrorMessage(error)}`);
  return { status: "error", code: "unexpected", ...checkInErrorMessage("unexpected") };
}

function revalidateStudentPages() {
  revalidatePath(ROUTES.student);
  revalidatePath(ROUTES.studentCalendar);
  revalidatePath(ROUTES.studentAttendance);
}

/** Check-in do próprio aluno. A conferência do raio acontece só no servidor. */
export async function checkInAction(input: { date: string; startTime: string; latitude: number; longitude: number }): Promise<CheckInResultState> {
  const profile = await requireCapability("student");
  try {
    const { distanceM } = await checkInStudent(profile, input);
    revalidateStudentPages();
    return { status: "success", message: `Presença confirmada. Você estava a cerca de ${distanceM} m do local.` };
  } catch (error) {
    return failure(error);
  }
}

/** Justificativa do próprio aluno: a falta fica Justificada na hora. */
export async function justifyAbsenceAction(input: { date: string; startTime: string; reason: string }): Promise<CheckInResultState> {
  const profile = await requireCapability("student");
  try {
    await justifyAbsence(profile, input);
    revalidateStudentPages();
    return { status: "success", message: "Falta justificada. O professor vê o motivo na chamada." };
  } catch (error) {
    return failure(error);
  }
}
