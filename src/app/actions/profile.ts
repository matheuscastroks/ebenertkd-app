"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireProfile } from "@/lib/auth/session";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { ROUTES } from "@/lib/navigation/routes";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export async function updateProfileAction(formData: FormData) {
  const profile = await requireProfile();
  const fullName = formData.get("full_name")?.toString().trim();
  const photo = formData.get("photo") as File | null;

  if (!fullName) {
    redirect(`${ROUTES.settings}?tab=profile&error=name_required`);
  }

  const { tables, storage, config } = createAppwriteAdminClient();
  let currentPrefs: Record<string, unknown> = {};

  try {
    if (profile.onboarding_preferences) {
      currentPrefs = JSON.parse(profile.onboarding_preferences);
    }
  } catch {
    currentPrefs = {};
  }

  if (photo && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type) || photo.size > MAX_PHOTO_BYTES) {
      redirect(`${ROUTES.settings}?tab=profile&error=invalid_photo`);
    }

    try {
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const file = await storage.createFile({
        bucketId: APPWRITE_IDS.bucket,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(bytes, photo.name || "avatar.jpg"),
        permissions: [],
      });
      currentPrefs.avatar_file_id = file.$id;
    } catch {
      redirect(`${ROUTES.settings}?tab=profile&error=upload_failed`);
    }
  }

  const now = new Date().toISOString();
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    rowId: profile.$id,
    data: {
      full_name: fullName,
      onboarding_preferences: JSON.stringify(currentPrefs),
      updated_at: now,
    },
  });

  invalidateTags(
    CACHE_TAGS.profiles,
    CACHE_TAGS.profile(profile.$id),
    CACHE_TAGS.profileAccount(profile.account_id)
  );
  revalidatePath(ROUTES.settings);
  revalidatePath(ROUTES.admin);

  redirect(`${ROUTES.settings}?tab=profile&saved=profile`);
}
