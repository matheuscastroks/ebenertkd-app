import type { ReactNode } from "react";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { requireCapability } from "@/lib/auth/session";

export default async function GuardianLayout({ children }: { children: ReactNode }) {
  const profile = await requireCapability("guardian");
  return <PortalFrame profile={profile}>{children}</PortalFrame>;
}
