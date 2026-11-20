"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { SETUP_BANNER_COOKIE } from "@/features/academy/setup-banner";

export async function dismissSetupBannerAction() {
  await requireProfile("admin");
  (await cookies()).set(SETUP_BANNER_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ROUTES.admin,
    maxAge: 60 * 60 * 24 * 30
  });
  revalidatePath(ROUTES.admin);
}
