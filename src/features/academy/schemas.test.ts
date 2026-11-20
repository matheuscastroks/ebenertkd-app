import { describe, expect, it } from "vitest";
import { DEFAULT_POLICIES } from "@/features/academy/defaults";
import { resolvePolicies } from "@/features/academy/policy-rules";
import { academyIdentitySchema, parsePolicyData, parsePolicyInput, PolicyValidationError } from "@/features/academy/schemas";
import { isValidCnpj, isValidDocument, isHexColor, contrastRatio } from "@/features/academy/validators";

const identityInput = { legal_name: "Academia Dragão Ltda", display_name: "Dragão TKD", short_name: "Dragão" };

describe("validadores", () => {
  it("CNPJ com dígito verificador", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });
  it("CPF e documento por tipo", () => {
    expect(isValidDocument("cpf", "529.982.247-25")).toBe(true);
    expect(isValidDocument("cpf", "529.982.247-24")).toBe(false);
    expect(isValidDocument("cnpj", "529.982.247-25")).toBe(false);
  });
  it("cor hexadecimal #RRGGBB", () => {
    expect(isHexColor("#f59300")).toBe(true);
    expect(isHexColor("f59300")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});

describe("schema da identidade", () => {
  it("aceita só os nomes e normaliza vazio para null", () => {
    const parsed = academyIdentitySchema.parse({ ...identityInput, document_number: "", address_zip: "", phone_whatsapp: "" });
    expect(parsed).toMatchObject({ document_type: null, document_number: null, address_zip: null, phone_whatsapp: null, theme_color: "#f59300" });
  });
  it("normaliza documento, CEP, telefone, estado e Instagram", () => {
    const parsed = academyIdentitySchema.parse({
      ...identityInput,
      document_type: "cnpj",
      document_number: "11.222.333/0001-81",
      address_zip: "24020-000",
      phone_whatsapp: "(21) 96518-8988",
      address_state: "rj",
      instagram_handle: "@dragao.tkd",
      theme_color: "#ABCDEF"
    });
    expect(parsed).toMatchObject({ document_number: "11222333000181", address_zip: "24020000", phone_whatsapp: "21965188988", address_state: "RJ", instagram_handle: "dragao.tkd", theme_color: "#abcdef" });
  });
  it("recusa CNPJ/CPF inválido, documento sem tipo, nome curto longo e cor inválida", () => {
    expect(academyIdentitySchema.safeParse({ ...identityInput, document_type: "cnpj", document_number: "11222333000182" }).success).toBe(false);
    expect(academyIdentitySchema.safeParse({ ...identityInput, document_type: "cpf", document_number: "11111111111" }).success).toBe(false);
    expect(academyIdentitySchema.safeParse({ ...identityInput, document_number: "11222333000181" }).success).toBe(false);
    expect(academyIdentitySchema.safeParse({ ...identityInput, short_name: "x".repeat(25) }).success).toBe(false);
    expect(academyIdentitySchema.safeParse({ ...identityInput, theme_color: "laranja" }).success).toBe(false);
  });
});

describe("leitura tolerante das políticas", () => {
  it("sem linha, JSON inválido ou vazio devolve exatamente os defaults", () => {
    expect(resolvePolicies(null)).toEqual(DEFAULT_POLICIES);
    expect(resolvePolicies([{ section: "billing", data_json: "{não é json" }])).toEqual(DEFAULT_POLICIES);
    expect(parsePolicyData("access", "[]")).toEqual(DEFAULT_POLICIES.access);
  });

  it("mantém os campos válidos e usa o default campo a campo nos inválidos", () => {
    const policy = parsePolicyData("billing", JSON.stringify({ default_monthly_fee_cents: 18000, due_day_options: [1, 10], charge_lead_days: "x", enrollment_fee_enabled: true, enrollment_fee_cents: 5000 }));
    expect(policy.default_monthly_fee_cents).toBe(18000);
    expect(policy.enrollment_fee_enabled).toBe(true);
    expect(policy.enrollment_fee_cents).toBe(5000);
    expect(policy.due_day_options).toEqual(DEFAULT_POLICIES.billing.due_day_options);
    expect(policy.charge_lead_days).toBe(7);
  });

  it("regra entre campos quebrada volta a seção ao padrão", () => {
    expect(parsePolicyData("access", JSON.stringify({ enabled: true, window_days: 3, warning_days: 10 }))).toEqual(DEFAULT_POLICIES.access);
    expect(parsePolicyData("contract", JSON.stringify({ exit_fee_mode: "fixed", exit_fee_cents: 0 }))).toEqual(DEFAULT_POLICIES.contract);
  });

  it("ordena listas de dias", () => {
    expect(parsePolicyData("billing", JSON.stringify({ due_day_options: [20, 5, 10] })).due_day_options).toEqual([5, 10, 20]);
    expect(parsePolicyData("contract", JSON.stringify({ renewal_reminder_days: [7, 30, 60] })).renewal_reminder_days).toEqual([60, 30, 7]);
  });
});

describe("gravação estrita das políticas", () => {
  it("completa com os defaults e aceita valores válidos", () => {
    expect(parsePolicyInput("access", { window_days: 45 })).toEqual({ enabled: true, window_days: 45, warning_days: 5 });
  });

  it("rejeita valores fora do limite com o campo apontado", () => {
    const run = () => parsePolicyInput("contract", { cancellation_notice_day: 30 });
    expect(run).toThrow(PolicyValidationError);
    try {
      run();
    } catch (error) {
      expect((error as PolicyValidationError).issues[0].field).toBe("cancellation_notice_day");
    }
  });

  it("valida dias de vencimento dentro do limite do schema (5 a 30), sem repetição", () => {
    expect(() => parsePolicyInput("billing", { due_day_options: [1, 10] })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("billing", { due_day_options: [10, 10] })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("billing", { due_day_options: [] })).toThrow(PolicyValidationError);
    expect(parsePolicyInput("billing", { due_day_options: [15, 5] }).due_day_options).toEqual([5, 15]);
  });

  it("exige valor com taxa de matrícula ligada, valor fixo no encargo fixo e janela maior que o aviso", () => {
    expect(() => parsePolicyInput("billing", { enrollment_fee_enabled: true, enrollment_fee_cents: 0 })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("contract", { exit_fee_mode: "fixed", exit_fee_cents: 0 })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("access", { window_days: 3, warning_days: 5 })).toThrow(PolicyValidationError);
    expect(parsePolicyInput("contract", { exit_fee_mode: "fixed", exit_fee_cents: 5000 }).exit_fee_cents).toBe(5000);
  });
});

describe("seção de exame", () => {
  it("nasce com os valores que estavam fixos no código", () => {
    expect(parsePolicyData("exam", null)).toEqual({
      default_fee_cents: null,
      block_on_overdue: true,
      almost_ready_pct: 75,
      fallback_min_days: 90,
      fallback_min_presences: 24,
      allow_skip_grades: true,
      absent_default_decision: null
    });
  });

  it("aceita taxa vazia (null), decisão padrão e números como texto", () => {
    const parsed = parsePolicyInput("exam", { default_fee_cents: "", absent_default_decision: "future_credit", almost_ready_pct: "80", fallback_min_days: "60" });
    expect(parsed).toMatchObject({ default_fee_cents: null, absent_default_decision: "future_credit", almost_ready_pct: 80, fallback_min_days: 60 });
    expect(parsePolicyInput("exam", { default_fee_cents: 15000 }).default_fee_cents).toBe(15000);
  });

  it("rejeita percentual fora de 1 a 100, decisão desconhecida e taxa negativa", () => {
    expect(() => parsePolicyInput("exam", { almost_ready_pct: 0 })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("exam", { almost_ready_pct: 101 })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("exam", { absent_default_decision: "talvez" })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("exam", { default_fee_cents: -1 })).toThrow(PolicyValidationError);
  });

  it("na leitura, campo inválido volta ao padrão e os válidos ficam", () => {
    const parsed = parsePolicyData("exam", JSON.stringify({ almost_ready_pct: 500, block_on_overdue: false, default_fee_cents: 12000 }));
    expect(parsed).toMatchObject({ almost_ready_pct: 75, block_on_overdue: false, default_fee_cents: 12000 });
  });
});

describe("seção de termos das faixas", () => {
  it("nasce com Poomsae e Gub e aceita os termos de outras federações", () => {
    expect(parsePolicyData("belts", null)).toEqual({ form_label: "Poomsae", level_label: "Gub" });
    expect(parsePolicyInput("belts", { form_label: " Tul ", level_label: "Gup" })).toEqual({ form_label: "Tul", level_label: "Gup" });
    expect(() => parsePolicyInput("belts", { form_label: "" })).toThrow(PolicyValidationError);
  });
});
