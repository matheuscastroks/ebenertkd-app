import type { ReactNode } from "react";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function AvisosLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  return <PortalFrame profile={profile}>{children}</PortalFrame>;
}
