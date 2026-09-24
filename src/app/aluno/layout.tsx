import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  return <PortalFrame profile={profile}>{children}</PortalFrame>;
}
