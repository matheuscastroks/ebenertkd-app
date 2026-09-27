"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createTrainingClass, setTrainingClassStatus, updateTrainingClass } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { CACHE_TAGS } from "@/lib/cache/tags";

function classInput(formData: FormData) {
  return {
    name: formData.get("name"),
    weekdays: formData.getAll("weekdays"),
    startTime: formData.get("start_time"),
    endTime: formData.get("end_time"),
    location: formData.get("location") || undefined,
    capacity: formData.get("capacity") || undefined
  };
}

export async function createTrainingClassAction(formData: FormData) {
  const admin = await requireProfile("admin");
  try {
    await createTrainingClass(admin, classInput(formData));
  } catch {
    redirect("/admin/turmas?error=create");
  }
  updateTag(CACHE_TAGS.trainingClasses);
  revalidatePath("/admin/turmas");
  redirect("/admin/turmas?created=1");
}

export async function updateTrainingClassAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const classId = String(formData.get("class_id") ?? "");
  try {
    await updateTrainingClass(admin, classId, classInput(formData));
  } catch {
    redirect("/admin/turmas?error=update");
  }
  updateTag(CACHE_TAGS.trainingClasses);
  revalidatePath("/admin/turmas");
  redirect("/admin/turmas?updated=1");
}

export async function setTrainingClassStatusAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const classId = String(formData.get("class_id") ?? "");
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "inactive") redirect("/admin/turmas?error=status");
  try {
    await setTrainingClassStatus(admin, classId, status);
  } catch {
    redirect("/admin/turmas?error=status");
  }
  updateTag(CACHE_TAGS.trainingClasses);
  revalidatePath("/admin/turmas");
  redirect("/admin/turmas?updated=1");
}
