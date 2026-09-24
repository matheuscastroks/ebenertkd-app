import type { AppCapability, AppRole } from "@/lib/auth/auth-utils";

export const capabilitiesByRole: Record<AppRole, AppCapability[]> = {
  admin: ["admin"],
  adult_student: ["student"],
  guardian: ["guardian"],
  minor_student: ["student"]
};

export function hasCapability(capabilities: AppCapability[], required: AppCapability) {
  return capabilities.includes(required);
}
