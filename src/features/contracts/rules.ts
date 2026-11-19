import { createHash } from "node:crypto";
import { DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";

export const CONTRACT_VARIABLES = [
  "student.full_name",
  "student.cpf",
  "guardian.full_name",
  "academy.name",
  "financial.monthly_fee",
  "financial.due_day",
  "contract.starts_at",
  "contract.ends_at",
  "academy.document",
  "academy.address",
  "academy.city",
  "professor.name",
  "contract.cancellation_notice_day",
  "contract.exit_fee",
  "contract.rematriculation_months",
  "fee.enrollment"
] as const;

export type ContractVariableKey = (typeof CONTRACT_VARIABLES)[number];

export const CONTRACT_VARIABLE_ALIASES: Record<string, ContractVariableKey> = {
  "student.full_name": "student.full_name",
  "student.cpf": "student.cpf",
  "guardian.full_name": "guardian.full_name",
  "academy.name": "academy.name",
  "financial.monthly_fee": "financial.monthly_fee",
  "financial.due_day": "financial.due_day",
  "contract.starts_at": "contract.starts_at",
  "contract.ends_at": "contract.ends_at",
  "academy.document": "academy.document",
  "academy.address": "academy.address",
  "academy.city": "academy.city",
  "professor.name": "professor.name",
  "contract.cancellation_notice_day": "contract.cancellation_notice_day",
  "contract.exit_fee": "contract.exit_fee",
  "contract.rematriculation_months": "contract.rematriculation_months",
  "fee.enrollment": "fee.enrollment",
  // Nomes amigáveis em português:
  "aluno.nome_completo": "student.full_name",
  "aluno.nome": "student.full_name",
  "aluno.cpf": "student.cpf",
  "responsavel.nome_completo": "guardian.full_name",
  "responsavel.nome": "guardian.full_name",
  "academia.nome": "academy.name",
  "mensalidade.valor": "financial.monthly_fee",
  "mensalidade.dia_vencimento": "financial.due_day",
  "contrato.data_inicio": "contract.starts_at",
  "contrato.data_termino": "contract.ends_at",
  "academia.documento": "academy.document",
  "academia.endereco": "academy.address",
  "academia.cidade": "academy.city",
  "professor.nome": "professor.name",
  "contrato.dia_limite_cancelamento": "contract.cancellation_notice_day",
  "contrato.encargo_saida": "contract.exit_fee",
  "contrato.meses_rematricula": "contract.rematriculation_months",
  "taxa.matricula": "fee.enrollment",
};

export interface FriendlyContractVariable {
  ptKey: string;
  enKey: ContractVariableKey;
  label: string;
  description: string;
  example: string;
}

export const FRIENDLY_CONTRACT_VARIABLES: FriendlyContractVariable[] = [
  {
    ptKey: "aluno.nome_completo",
    enKey: "student.full_name",
    label: "Nome do Aluno",
    description: "Nome completo do aluno cadastrado",
    example: "Matheus Souza Castro de Araújo",
  },
  {
    ptKey: "aluno.cpf",
    enKey: "student.cpf",
    label: "CPF do Aluno",
    description: "CPF formatado do aluno",
    example: "000.000.000-00",
  },
  {
    ptKey: "responsavel.nome_completo",
    enKey: "guardian.full_name",
    label: "Nome do Responsável",
    description: "Nome do responsável legal (para menores)",
    example: "Responsável Legal",
  },
  {
    ptKey: "academia.nome",
    enKey: "academy.name",
    label: "Nome da Academia",
    description: "Nome oficial da academia ou associação",
    example: "Ebener Taekwondo",
  },
  {
    ptKey: "mensalidade.valor",
    enKey: "financial.monthly_fee",
    label: "Valor da Mensalidade",
    description: "Valor acordado da mensalidade (em R$)",
    example: "R$ 150,00",
  },
  {
    ptKey: "mensalidade.dia_vencimento",
    enKey: "financial.due_day",
    label: "Dia do Vencimento",
    description: "Dia do mês para pagamento",
    example: "10",
  },
  {
    ptKey: "contrato.data_inicio",
    enKey: "contract.starts_at",
    label: "Início do Contrato",
    description: "Data de início da vigência",
    example: "01/01/2026",
  },
  {
    ptKey: "contrato.data_termino",
    enKey: "contract.ends_at",
    label: "Término do Contrato",
    description: "Data final de vigência ou renovação",
    example: "01/01/2027",
  },
  {
    ptKey: "academia.documento",
    enKey: "academy.document",
    label: "Documento da Academia",
    description: "CNPJ ou CPF informado em Academia > Identidade",
    example: "CNPJ 00.000.000/0001-00",
  },
  {
    ptKey: "academia.endereco",
    enKey: "academy.address",
    label: "Endereço da Academia",
    description: "Endereço completo informado em Academia > Identidade",
    example: "Rua das Artes, 100, Centro, Niterói/RJ",
  },
  {
    ptKey: "academia.cidade",
    enKey: "academy.city",
    label: "Cidade da Academia",
    description: "Cidade e estado da academia",
    example: "Niterói/RJ",
  },
  {
    ptKey: "professor.nome",
    enKey: "professor.name",
    label: "Professor",
    description: "Título e nome do professor responsável",
    example: "Mestre Ebener Santos",
  },
  {
    ptKey: "contrato.dia_limite_cancelamento",
    enKey: "contract.cancellation_notice_day",
    label: "Dia limite do cancelamento",
    description: "Dia do mês anterior até o qual o cancelamento é sem encargo",
    example: "20",
  },
  {
    ptKey: "contrato.encargo_saida",
    enKey: "contract.exit_fee",
    label: "Encargo de saída",
    description: "Valor cobrado quando o aviso passa do prazo (uma mensalidade, valor fixo ou nenhum)",
    example: "uma mensalidade",
  },
  {
    ptKey: "contrato.meses_rematricula",
    enKey: "contract.rematriculation_months",
    label: "Meses para rematrícula",
    description: "Afastamento a partir do qual uma nova matrícula pode ser exigida",
    example: "6",
  },
  {
    ptKey: "taxa.matricula",
    enKey: "fee.enrollment",
    label: "Taxa de matrícula",
    description: "Valor da taxa de matrícula, ou \"isenta\" quando não há cobrança",
    example: "R$ 50,00",
  },
];

export type ContractVariables = Partial<Record<ContractVariableKey | string, string>>;

export function hashContent(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function renderContractTemplate(template: string, variables: ContractVariables) {
  return template.replace(/{{\s*([a-z_0-9]+(?:\.[a-z_0-9]+)?)\s*}}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const canonicalKey = CONTRACT_VARIABLE_ALIASES[key];
    if (!canonicalKey) throw new Error(`unknown_contract_variable:${rawKey}`);
    const value = variables[canonicalKey] ?? variables[key];
    if (!value) throw new Error(`missing_contract_variable:${rawKey}`);
    return value;
  });
}

export function contractReminderDays(endDate: string, referenceDate: string) {
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`);
  const reference = Date.parse(`${referenceDate.slice(0, 10)}T00:00:00Z`);
  return Math.round((end - reference) / 86400000);
}

/** Aviso de renovação: nos dias da política (padrão 30 e 7 antes do fim) ou quando o contrato já terminou. */
export function renewalEvent(endDate: string, referenceDate: string, reminderDays: readonly number[] = DEFAULT_CONTRACT_POLICY.renewal_reminder_days) {
  const days = contractReminderDays(endDate, referenceDate);
  if (reminderDays.includes(days)) return { kind: "reminder" as const, days };
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
