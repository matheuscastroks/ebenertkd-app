import { describe, expect, it } from "vitest";
import { buildAcademyContractVariables, buildContractPolicySnapshot, parseContractPolicySnapshot } from "@/features/academy/contract-policy";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";
import { professorLabel, professorSignature, resolveAcademyIdentity } from "@/features/academy/identity-rules";
import { enrollmentFeeToCharge, isDueDayAllowed } from "@/features/academy/policy-rules";
import { renderContractTemplate } from "@/features/contracts/rules";
import { formatBrl } from "@/lib/money";
import { calculateExitFee, requiresRematricula } from "@/lib/domain/billing-rules";

const baseVariables = {
  "student.full_name": "Ana",
  "student.cpf": "123",
  "guardian.full_name": "não se aplica",
  "financial.monthly_fee": "R$ 150,00",
  "financial.due_day": "10",
  "contract.starts_at": "01/01/2026",
  "contract.ends_at": "01/01/2027"
};

describe("regras de saída lidas do snapshot do contrato", () => {
  const exit = { targetExitMonth: "2026-07-01", monthlyFeeInCents: 15000 };

  it("sem política explícita mantém o comportamento legado: dia 20 e uma mensalidade", () => {
    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-20" })).toBe(0);
    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-21" })).toBe(15000);
  });

  it("o contrato assinado mantém a regra da época mesmo depois de a política mudar", () => {
    const signed = JSON.stringify(buildContractPolicySnapshot(DEFAULT_CONTRACT_POLICY));
    const changedPolicy = { ...DEFAULT_CONTRACT_POLICY, cancellation_notice_day: 10, exit_fee_mode: "fixed" as const, exit_fee_cents: 9000 };
    const newContractSnapshot = JSON.stringify(buildContractPolicySnapshot(changedPolicy));

    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-15", policy: parseContractPolicySnapshot(signed) })).toBe(0);
    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-21", policy: parseContractPolicySnapshot(signed) })).toBe(15000);
    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-15", policy: parseContractPolicySnapshot(newContractSnapshot) })).toBe(9000);
  });

  it("modos de encargo: mensalidade, valor fixo e nenhum; e dia limite configurável", () => {
    const late = { ...exit, noticeDate: "2026-06-28" };
    expect(calculateExitFee({ ...late, policy: { cancellation_notice_day: 20, exit_fee_mode: "one_monthly_fee", exit_fee_cents: 0 } })).toBe(15000);
    expect(calculateExitFee({ ...late, policy: { cancellation_notice_day: 20, exit_fee_mode: "fixed", exit_fee_cents: 4000 } })).toBe(4000);
    expect(calculateExitFee({ ...late, policy: { cancellation_notice_day: 20, exit_fee_mode: "none", exit_fee_cents: 0 } })).toBe(0);
    expect(calculateExitFee({ ...exit, noticeDate: "2026-06-12", policy: { cancellation_notice_day: 10, exit_fee_mode: "one_monthly_fee", exit_fee_cents: 0 } })).toBe(15000);
  });

  it("snapshot é obrigatório: ausente ou inválido é erro, sem ramo legado", () => {
    expect(() => parseContractPolicySnapshot(null)).toThrow("contract_policy_snapshot_invalid");
    expect(() => parseContractPolicySnapshot("{}")).toThrow("contract_policy_snapshot_invalid");
    expect(() => parseContractPolicySnapshot("não é json")).toThrow("contract_policy_snapshot_invalid");
  });

  it("meses de rematrícula configuráveis (padrão 6)", () => {
    const input = { lastActiveDate: "2026-01-10", returnDate: "2026-08-10" };
    expect(requiresRematricula(input)).toBe(true);
    expect(requiresRematricula({ ...input, months: 12 })).toBe(false);
  });
});

describe("variáveis do contrato (C2/C4)", () => {
  const variables = (identity = DEFAULT_ACADEMY_IDENTITY, contract = DEFAULT_CONTRACT_POLICY, billing = DEFAULT_BILLING_POLICY) =>
    buildAcademyContractVariables({ identity, contractPolicy: contract, billingPolicy: billing });

  it("sem configuração reproduz o texto antigo do contrato", () => {
    const text = renderContractTemplate(
      "{{ academia.nome }}|{{ contrato.dia_limite_cancelamento }}|{{ contrato.encargo_saida }}|{{ contrato.meses_rematricula }}|{{ taxa.matricula }}|{{ academia.documento }}|{{ professor.nome }}",
      { ...baseVariables, ...variables() }
    );
    expect(text).toBe("Ebener Taekwondo|20|uma mensalidade|6|isenta|não informado|Mestre Ebener Santos");
  });

  it("usa identidade, política e taxa de matrícula quando configuradas", () => {
    const identity = resolveAcademyIdentity({ legal_name: "Dragão Ltda", document_type: "cnpj", document_number: "11222333000181", address_line: "Rua A, 1", address_city: "Niterói", address_state: "RJ", professor_name: "Kim", professor_title: "Sabumnim" });
    const text = renderContractTemplate(
      "{{ academia.nome }}; {{ academia.documento }}; {{ academia.endereco }}; {{ academia.cidade }}; {{ professor.nome }}; {{ contrato.encargo_saida }}; {{ taxa.matricula }}",
      { ...baseVariables, ...variables(identity, { ...DEFAULT_CONTRACT_POLICY, exit_fee_mode: "fixed", exit_fee_cents: 5000 }, { ...DEFAULT_BILLING_POLICY, enrollment_fee_enabled: true, enrollment_fee_cents: 8000 }) }
    );
    expect(text).toContain("Dragão Ltda; CNPJ 11.222.333/0001-81; Rua A, 1, Niterói/RJ; Niterói/RJ; Sabumnim Kim;");
    expect(text).toContain(formatBrl(5000));
    expect(text.endsWith(formatBrl(8000))).toBe(true);
  });

  it("assinatura do professor usa a identidade só depois de configurada", () => {
    expect(professorLabel(DEFAULT_ACADEMY_IDENTITY)).toBe("Mestre Ebener Santos");
    expect(professorSignature(resolveAcademyIdentity(null), "Fulano Admin")).toBe("Fulano Admin");
    expect(professorSignature(resolveAcademyIdentity({ professor_name: "Kim", professor_title: "Mestre" }), "Fulano Admin")).toBe("Mestre Kim");
  });
});

describe("taxa de matrícula e dias de vencimento", () => {
  it("desabilitada por padrão: nada a cobrar", () => {
    expect(enrollmentFeeToCharge(DEFAULT_BILLING_POLICY)).toBeNull();
    expect(enrollmentFeeToCharge({ enrollment_fee_enabled: true, enrollment_fee_cents: 0 })).toBeNull();
    expect(enrollmentFeeToCharge({ enrollment_fee_enabled: true, enrollment_fee_cents: 8000 })).toBe(8000);
  });

  it("dia fora das opções só vale se já for o dia gravado na matrícula", () => {
    expect(isDueDayAllowed(10, [5, 10])).toBe(true);
    expect(isDueDayAllowed(15, [5, 10])).toBe(false);
    expect(isDueDayAllowed(15, [5, 10], 15)).toBe(true);
  });
});
