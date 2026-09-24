import type { ReactNode } from "react";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("admin");
  return <PortalFrame profile={profile}>{children}</PortalFrame>;
}
