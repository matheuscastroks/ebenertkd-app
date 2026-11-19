"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { deleteLocation, saveLocation } from "@/features/locations/locations-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { safeErrorMessage } from "@/lib/security/safe-error";

function revalidateLocationPages() {
  revalidatePath(ROUTES.adminLocations);
  revalidatePath(ROUTES.adminClasses);
  revalidatePath(ROUTES.adminExams);
}

export async function saveLocationAction(formData: FormData) {
  const actor = await requireProfile("admin");

  const id = formData.get("id")?.toString() || undefined;
  const returnTo = formData.get("return_to")?.toString() || ROUTES.adminLocations;
  // Só caminhos internos: nunca redireciona para fora do app.
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : ROUTES.adminLocations;

  try {
    await saveLocation(actor, {
      id,
      name: formData.get("name")?.toString(),
      address: formData.get("address")?.toString(),
      complement: formData.get("complement")?.toString(),
      notes: formData.get("notes")?.toString(),
      ...(formData.has("is_default") ? { is_default: formData.get("is_default") === "on" } : {})
    });
  } catch (error) {
    if (error instanceof ZodError) redirect(`${safeReturn}?error=name_required`);
    console.error(`[locations] save_failed: ${safeErrorMessage(error)}`);
    redirect(`${safeReturn}?error=save_failed`);
  }

  revalidateLocationPages();
  redirect(`${safeReturn}?saved=location`);
}

export async function deleteLocationAction(formData: FormData) {
  const actor = await requireProfile("admin");

  const id = formData.get("id")?.toString();
  if (!id) {
    redirect(`${ROUTES.adminLocations}?error=invalid_id`);
  }

  try {
    await deleteLocation(actor, id);
  } catch (error) {
    console.error(`[locations] delete_failed: ${safeErrorMessage(error)}`);
    redirect(`${ROUTES.adminLocations}?error=delete_failed`);
  }

  revalidateLocationPages();
  redirect(`${ROUTES.adminLocations}?deleted=location`);
}
