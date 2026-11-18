import { createHash } from "node:crypto";

export const CONTRACT_VARIABLES = [
  "student.full_name",
  "student.cpf",
  "guardian.full_name",
  "academy.name",
  "financial.monthly_fee",
  "financial.due_day",
  "contract.starts_at",
  "contract.ends_at"
] as const;

export type ContractVariables = Partial<Record<(typeof CONTRACT_VARIABLES)[number], string>>;

export function hashContent(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function renderContractTemplate(template: string, variables: ContractVariables) {
  const allowed = new Set<string>(CONTRACT_VARIABLES);
  return template.replace(/{{\s*([a-z_]+\.[a-z_]+)\s*}}/gi, (_, key: string) => {
    if (!allowed.has(key)) throw new Error(`unknown_contract_variable:${key}`);
    const value = variables[key as keyof ContractVariables];
    if (!value) throw new Error(`missing_contract_variable:${key}`);
    return value;
  });
}

export function contractReminderDays(endDate: string, referenceDate: string) {
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`);
  const reference = Date.parse(`${referenceDate.slice(0, 10)}T00:00:00Z`);
  return Math.round((end - reference) / 86400000);
}

export function renewalEvent(endDate: string, referenceDate: string) {
  const days = contractReminderDays(endDate, referenceDate);
  if (days === 30 || days === 7) return { kind: "reminder" as const, days };
  if (days < 0) return { kind: "expired" as const, days };
  return null;
}

export type RenewalBucket = "expired" | "due_7d" | "due_30d" | "due_60d" | "due_90d" | "healthy";

export function classifyContractRenewalBucket(
  endDate: string,
  referenceDate: string
): { bucket: RenewalBucket; daysRemaining: number } {
  const daysRemaining = contractReminderDays(endDate, referenceDate);
  if (daysRemaining < 0) return { bucket: "expired", daysRemaining };
  if (daysRemaining <= 7) return { bucket: "due_7d", daysRemaining };
  if (daysRemaining <= 30) return { bucket: "due_30d", daysRemaining };
  if (daysRemaining <= 60) return { bucket: "due_60d", daysRemaining };
  if (daysRemaining <= 90) return { bucket: "due_90d", daysRemaining };
  return { bucket: "healthy", daysRemaining };
}

export function privacyIpFingerprint(ip?: string | null) {
  if (!ip) return undefined;
  const reduced = ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip.split(".").slice(0, 3).join(".");
  return hashContent(reduced);
}

export function canSignContract(input: { role: string; actorProfileId: string; studentProfileId: string; capabilities: string[]; studentAccessGranted: boolean }) {
  if (input.role === "minor_student" || !input.studentAccessGranted) return false;
  if (input.actorProfileId === input.studentProfileId) return input.capabilities.includes("student");
  return input.capabilities.includes("guardian");
}
