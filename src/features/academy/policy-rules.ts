import { POLICY_SECTIONS, type AcademyPolicies, type PolicySection } from "@/features/academy/defaults";
import { parsePolicyData } from "@/features/academy/schemas";

export type PolicyRow = { section: string; schema_version?: number; data_json?: string; revision?: number };

/** Resolve todas as seções: linha ausente ou inválida vira o default (campo a campo). */
export function resolvePolicies(rows: readonly PolicyRow[] | null | undefined): AcademyPolicies {
  const bySection = new Map((rows ?? []).map((row) => [row.section, row]));
  const result = {} as Record<PolicySection, unknown>;
  for (const section of POLICY_SECTIONS) {
    const row = bySection.get(section);
    result[section] = parsePolicyData(section, row?.data_json, row?.schema_version);
  }
  return result as AcademyPolicies;
}

export function policyRevision(rows: readonly PolicyRow[] | null | undefined, section: PolicySection) {
  return rows?.find((row) => row.section === section)?.revision ?? 0;
}

/** Dia de vencimento válido: está nas opções atuais ou já é o dia gravado na matrícula (mudar a política não invalida fichas). */
export function isDueDayAllowed(day: number, options: readonly number[], current?: number | null) {
  return options.includes(day) || (current != null && day === current);
}

/** Valor da taxa de matrícula a cobrar na aprovação; `null` quando a cobrança está desativada (padrão). */
export function enrollmentFeeToCharge(policy: { enrollment_fee_enabled: boolean; enrollment_fee_cents: number }): number | null {
  return policy.enrollment_fee_enabled && policy.enrollment_fee_cents > 0 ? policy.enrollment_fee_cents : null;
}
