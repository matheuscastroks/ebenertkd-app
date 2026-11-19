import { describe, expect, it } from "vitest";
import { DEFAULT_ACCESS_POLICY, DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";
import { accessImpactNotes, billingImpactNotes, contractImpactNotes, templateUsesCancellationVariables } from "@/features/academy/impact-notes";
import { countLockedStudents } from "@/features/academy/impact-rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";

const enrollment = (studentId: string) => ({ $id: `enr-${studentId}`, student_id: studentId, status: "active" }) as unknown as Enrollment;
const charge = (studentId: string) => ({ $id: `chg-${studentId}`, student_id: studentId, charge_type: "monthly_fee", status: "paid", due_date: "2026-10-10T12:00:00.000Z" }) as unknown as Charge;
const payment = (studentId: string, paidAt: string) => ({ $id: `pay-${studentId}`, charge_id: `chg-${studentId}`, status: "confirmed", paid_at: paidAt }) as unknown as Payment;

describe("aviso de impacto do bloqueio de acesso", () => {
  const data = {
    enrollments: [enrollment("a"), enrollment("b")],
    charges: [charge("a"), charge("b")],
    // a pagou há 40 dias, b pagou há 10 dias
    payments: [payment("a", "2026-10-09T12:00:00.000Z"), payment("b", "2026-11-08T12:00:00.000Z")],
    referenceDate: "2026-11-18"
  };

  it("conta quem ficaria bloqueado hoje com cada janela", () => {
    expect(countLockedStudents({ ...data, policy: DEFAULT_ACCESS_POLICY })).toBe(1);
    expect(countLockedStudents({ ...data, policy: { ...DEFAULT_ACCESS_POLICY, window_days: 45 } })).toBe(0);
    expect(countLockedStudents({ ...data, policy: { ...DEFAULT_ACCESS_POLICY, window_days: 7 } })).toBe(2);
  });

  it("com o bloqueio desligado ninguém fica bloqueado", () => {
    expect(countLockedStudents({ ...data, policy: { ...DEFAULT_ACCESS_POLICY, enabled: false } })).toBe(0);
  });

  it("avisos em texto só aparecem para o que mudou", () => {
    expect(accessImpactNotes(DEFAULT_ACCESS_POLICY, DEFAULT_ACCESS_POLICY)).toEqual([]);
    expect(accessImpactNotes(DEFAULT_ACCESS_POLICY, { ...DEFAULT_ACCESS_POLICY, enabled: false })[0]).toContain("desligado");
    expect(accessImpactNotes(DEFAULT_ACCESS_POLICY, { ...DEFAULT_ACCESS_POLICY, window_days: 45 })[0]).toContain("de 30 para 45 dias");
  });
});

describe("avisos de impacto financeiro e de contrato", () => {
  it("mensalidade padrão vale só para novas matrículas e aponta o reajuste", () => {
    const notes = billingImpactNotes(DEFAULT_BILLING_POLICY, { ...DEFAULT_BILLING_POLICY, default_monthly_fee_cents: 18000 });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("apenas para novas matrículas");
    expect(notes[0]).toContain("Reajuste de mensalidade");
  });

  it("dias removidos e taxa de matrícula", () => {
    const notes = billingImpactNotes(DEFAULT_BILLING_POLICY, { ...DEFAULT_BILLING_POLICY, due_day_options: [10, 20], enrollment_fee_enabled: true, enrollment_fee_cents: 5000 });
    expect(notes.join(" ")).toContain("Os dias 5, 15, 25, 30 deixam de ser oferecidos");
    expect(notes.join(" ")).toContain("taxa de matrícula");
  });

  it("cancelamento: contratos assinados mantêm a regra e avisa publicar novo modelo", () => {
    const changed = { ...DEFAULT_CONTRACT_POLICY, cancellation_notice_day: 10 };
    expect(contractImpactNotes(DEFAULT_CONTRACT_POLICY, DEFAULT_CONTRACT_POLICY, false)).toEqual([]);
    const notes = contractImpactNotes(DEFAULT_CONTRACT_POLICY, changed, false);
    expect(notes[0]).toContain("Contratos já assinados mantêm");
    expect(notes[1]).toContain("publique uma nova versão");
    expect(contractImpactNotes(DEFAULT_CONTRACT_POLICY, changed, true)).toHaveLength(1);
  });

  it("detecta se o modelo publicado usa as variáveis de cancelamento", () => {
    expect(templateUsesCancellationVariables("até o dia 20 ... uma mensalidade")).toBe(false);
    expect(templateUsesCancellationVariables("dia {{ contrato.dia_limite_cancelamento }} e {{contrato.encargo_saida}}")).toBe(true);
  });
});
