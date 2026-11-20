import { EXIT_FEE_MODES, type AcademyIdentity, type BillingPolicy, type ContractPolicy, type ExitFeeMode } from "@/features/academy/defaults";
import { identityAddress, identityCity, identityDocumentLabel, professorLabel } from "@/features/academy/identity-rules";
import { formatBrl } from "@/lib/money";

/** Regras que valem para um contrato desde a assinatura. Guardado (obrigatório) em `contracts.policy_snapshot_json`. */
export type ContractPolicySnapshot = {
  schema_version: 1;
  cancellation_notice_day: number;
  exit_fee_mode: ExitFeeMode;
  exit_fee_cents: number;
  rematriculation_after_months: number;
};

export function buildContractPolicySnapshot(policy: ContractPolicy): ContractPolicySnapshot {
  return {
    schema_version: 1,
    cancellation_notice_day: policy.cancellation_notice_day,
    exit_fee_mode: policy.exit_fee_mode,
    exit_fee_cents: policy.exit_fee_cents,
    rematriculation_after_months: policy.rematriculation_after_months
  };
}

/** O snapshot é obrigatório: contrato sem snapshot válido é erro, não "contrato antigo". */
export function parseContractPolicySnapshot(raw: string | null | undefined): ContractPolicySnapshot {
  let value: Partial<ContractPolicySnapshot>;
  try {
    value = JSON.parse(raw ?? "") as Partial<ContractPolicySnapshot>;
  } catch {
    throw new Error("contract_policy_snapshot_invalid");
  }
  const day = Number(value.cancellation_notice_day);
  const fee = Number(value.exit_fee_cents);
  const months = Number(value.rematriculation_after_months);
  const mode = value.exit_fee_mode;
  if (!Number.isInteger(day) || day < 1 || day > 28 || !mode || !(EXIT_FEE_MODES as readonly string[]).includes(mode) || !Number.isInteger(fee) || fee < 0 || !Number.isInteger(months) || months < 1) {
    throw new Error("contract_policy_snapshot_invalid");
  }
  return { schema_version: 1, cancellation_notice_day: day, exit_fee_mode: mode, exit_fee_cents: fee, rematriculation_after_months: months };
}

/** Texto do encargo para a frase "o encargo de saída será de ...". */
export function exitFeeText(policy: Pick<ContractPolicy, "exit_fee_mode" | "exit_fee_cents">) {
  if (policy.exit_fee_mode === "fixed") return formatBrl(policy.exit_fee_cents);
  if (policy.exit_fee_mode === "none") return "R$ 0,00 (sem encargo)";
  return "uma mensalidade";
}

const NOT_INFORMED = "não informado";

/** Variáveis do contrato ligadas à academia e à política (C2/C4). Sempre texto não vazio: o renderizador recusa vazio. */
export function buildAcademyContractVariables(input: { identity: AcademyIdentity; contractPolicy: ContractPolicy; billingPolicy: BillingPolicy }) {
  const { identity, contractPolicy, billingPolicy } = input;
  const enrollmentFee = billingPolicy.enrollment_fee_enabled && billingPolicy.enrollment_fee_cents > 0 ? formatBrl(billingPolicy.enrollment_fee_cents) : "isenta";
  return {
    "academy.name": identity.legal_name,
    "academy.document": identityDocumentLabel(identity) ?? NOT_INFORMED,
    "academy.address": identityAddress(identity) ?? NOT_INFORMED,
    "academy.city": identityCity(identity) ?? NOT_INFORMED,
    "professor.name": professorLabel(identity, NOT_INFORMED),
    "contract.cancellation_notice_day": String(contractPolicy.cancellation_notice_day),
    "contract.exit_fee": exitFeeText(contractPolicy),
    "contract.rematriculation_months": String(contractPolicy.rematriculation_after_months),
    "fee.enrollment": enrollmentFee
  };
}
