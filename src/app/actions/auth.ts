"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adultLoginSchema,
  adultRegistrationSchema,
  minorLoginSchema,
  recoveryConfirmationSchema,
  recoverySchema
} from "@/features/auth/schemas";
import {
  confirmPasswordRecovery,
  assertMinorLoginAllowed,
  clearMinorLoginAttempts,
  createAdultAccount,
  createEmailSession,
  requestPasswordRecovery,
  resolveMinorEmail,
  promoteMinorToAdult,
  writeAuditEvent
} from "@/features/auth/service";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/ids";
import { appwriteSessionCookie, createAppwriteSessionClient } from "@/lib/appwrite/session";
import { getCurrentProfile } from "@/lib/auth/session";

const genericLoginError = encodeURIComponent("Credenciais inválidas.");

async function persistSession(secret: string, expire: string) {
  const cookie = appwriteSessionCookie(expire);
  (await cookies()).set(cookie.name, secret, cookie.options);
}

async function redirectForCurrentProfile() {
  const profile = await getCurrentProfile();
  if (profile?.role === "admin") {
    await writeAuditEvent("auth.admin.login", profile.account_id, "profile", profile.$id).catch(() => undefined);
  }
  redirect(profile ? resolveDashboardPath(profile.role) : "/?error=account_unavailable");
}

export async function loginAdultAction(formData: FormData) {
  const parsed = adultLoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect(`/?error=invalid_credentials&context=adult&message=${genericLoginError}`);
  try {
    const session = await createEmailSession(parsed.data.email, parsed.data.password);
    await persistSession(session.secret, session.expire);
  } catch {
    redirect(`/?error=invalid_credentials&context=adult&message=${genericLoginError}`);
  }
  await redirectForCurrentProfile();
}

export async function loginMinorAction(formData: FormData) {
  const parsed = minorLoginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) redirect(`/?error=invalid_credentials&context=minor&message=${genericLoginError}`);
  try {
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const attemptKey = `${ip}:${parsed.data.username}`;
    assertMinorLoginAllowed(attemptKey);
    const email = await resolveMinorEmail(parsed.data.username);
    const session = await createEmailSession(email, parsed.data.password);
    await persistSession(session.secret, session.expire);
    clearMinorLoginAttempts(attemptKey);
  } catch {
    redirect(`/?error=invalid_credentials&context=minor&message=${genericLoginError}`);
  }
  await redirectForCurrentProfile();
}

export async function promoteMinorAction(formData: FormData) {
  const admin = await (await import("@/lib/auth/session")).requireProfile("admin");
  const minorProfileId = String(formData.get("minor_profile_id") ?? "").trim();
  const parsedEmail = recoverySchema.safeParse({ email: formData.get("email") });
  const retainGuardianAccess = formData.get("retain_guardian_access") === "on";
  if (!minorProfileId || !parsedEmail.success) redirect("/admin?error=promotion");
  try {
    await promoteMinorToAdult(minorProfileId, parsedEmail.data.email, admin.account_id, retainGuardianAccess);
  } catch {
    redirect("/admin?error=promotion");
  }
  redirect("/admin?promoted=1");
}

export async function registerAdultAction(formData: FormData) {
  const parsed = adultRegistrationSchema.safeParse({
    fullName: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("account_type")
  });
  if (!parsed.success) redirect("/?error=registration_invalid&context=cadastro");
  try {
    await createAdultAccount(parsed.data);
  } catch {
    redirect("/?error=registration_failed&context=cadastro");
  }
  redirect("/?registered=1&context=cadastro");
}

export async function requestRecoveryAction(formData: FormData) {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });
  if (parsed.success) await requestPasswordRecovery(parsed.data.email);
  redirect("/recuperar?sent=1");
}

export async function confirmRecoveryAction(formData: FormData) {
  const parsed = recoveryConfirmationSchema.safeParse({
    userId: formData.get("userId"), secret: formData.get("secret"), password: formData.get("password")
  });
  if (!parsed.success) redirect("/recuperar/confirmar?error=invalid");
  try {
    await confirmPasswordRecovery(parsed.data.userId, parsed.data.secret, parsed.data.password);
  } catch {
    redirect("/recuperar/confirmar?error=invalid");
  }
  redirect("/?message=password_updated");
}

export async function logoutAction() {
  const appwrite = await createAppwriteSessionClient();
  try {
    await appwrite?.account.deleteSession({ sessionId: "current" });
  } catch {
    // Remove the local cookie even if the remote session is already expired.
  }
  (await cookies()).delete(APPWRITE_SESSION_COOKIE);
  redirect("/");
}
