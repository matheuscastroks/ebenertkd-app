"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth/session";
import { deleteLocation, saveLocation } from "@/features/locations/locations-service";
import { ROUTES } from "@/lib/navigation/routes";

export async function saveLocationAction(formData: FormData) {
  await requireCapability("admin");

  const id = formData.get("id")?.toString() || undefined;
  const name = formData.get("name")?.toString().trim();
  const address = formData.get("address")?.toString().trim() || undefined;
  const complement = formData.get("complement")?.toString().trim() || undefined;
  const notes = formData.get("notes")?.toString().trim() || undefined;
  const returnTo = formData.get("return_to")?.toString() || ROUTES.adminLocations;

  if (!name) {
    redirect(`${returnTo}?error=name_required`);
  }

  await saveLocation({
    id,
    name,
    address,
    complement,
    notes,
  });

  revalidatePath(ROUTES.adminLocations);
  revalidatePath(ROUTES.adminClasses);
  revalidatePath(ROUTES.adminExams);
  redirect(`${returnTo}?saved=location`);
}

export async function deleteLocationAction(formData: FormData) {
  await requireCapability("admin");

  const id = formData.get("id")?.toString();
  if (!id) {
    redirect(`${ROUTES.adminLocations}?error=invalid_id`);
  }

  await deleteLocation(id);

  revalidatePath(ROUTES.adminLocations);
  revalidatePath(ROUTES.adminClasses);
  revalidatePath(ROUTES.adminExams);
  redirect(`${ROUTES.adminLocations}?deleted=location`);
}
