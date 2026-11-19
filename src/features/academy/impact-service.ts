import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getPolicy } from "@/features/academy/config-service";
import { countLockedStudents } from "@/features/academy/impact-rules";
import { parsePolicyInput } from "@/features/academy/schemas";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { saoPauloToday } from "@/lib/dates";

export type AccessImpact = { total: number; lockedNow: number; lockedProposed: number };

/** "N alunos ficariam bloqueados hoje com a nova janela". Somente leitura; só o administrador consulta. */
export async function previewAccessImpact(actor: Profile, patch: Record<string, unknown>): Promise<AccessImpact> {
  if (actor.role !== "admin") throw new Error("admin_required");
  const current = await getPolicy("access");
  const proposed = parsePolicyInput("access", { ...current, ...patch });
  const [enrollments, charges, payments] = await Promise.all([
    listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments, [Query.equal("status", ["active", "awaiting_renewal"])]),
    listAllRows<Charge>(APPWRITE_IDS.tables.charges, [Query.equal("charge_type", ["monthly_fee"]), Query.notEqual("status", ["cancelled"])]),
    listAllRows<Payment>(APPWRITE_IDS.tables.payments, [Query.equal("status", ["confirmed"])])
  ]);
  const referenceDate = saoPauloToday();
  return {
    total: enrollments.length,
    lockedNow: countLockedStudents({ enrollments, charges, payments, policy: current, referenceDate }),
    lockedProposed: countLockedStudents({ enrollments, charges, payments, policy: proposed, referenceDate })
  };
}
