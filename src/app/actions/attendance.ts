"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAttendanceBatch } from "@/features/classes/attendance-service";
import { createLesson } from "@/features/classes/lesson-service";
import { requireProfile } from "@/lib/auth/session";
import { adminClassPath, adminLessonPath } from "@/lib/navigation/routes";

export async function createLessonAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const classId = String(formData.get("class_id") ?? "");
  let lessonId: string;
  try {
    const lesson = await createLesson(admin, {
      trainingClassId: classId,
      lessonDate: formData.get("lesson_date"),
      startTime: formData.get("start_time"),
      endTime: formData.get("end_time"),
      lessonType: formData.get("lesson_type")
    });
    lessonId = lesson.$id;
  } catch {
    redirect(`${adminClassPath(classId)}?error=lesson`);
  }
  revalidatePath(adminClassPath(classId));
  redirect(adminLessonPath(classId, lessonId));
}

export async function saveAttendanceAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const classId = String(formData.get("class_id") ?? "");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const records = [...formData.entries()]
    .filter(([key]) => key.startsWith("attendance:"))
    .map(([key, value]) => ({ classEnrollmentId: key.slice("attendance:".length), status: String(value) }));
  try {
    await saveAttendanceBatch(admin, { lessonId, records, correctionReason: formData.get("correction_reason") || undefined });
  } catch (error) {
    const code = error instanceof Error && error.message === "attendance_correction_reason_required" ? "reason" : "attendance";
    redirect(`${adminLessonPath(classId, lessonId)}?error=${code}`);
  }
  revalidatePath(adminLessonPath(classId, lessonId));
  redirect(`${adminLessonPath(classId, lessonId)}?saved=1`);
}
