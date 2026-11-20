import { describe, expect, it } from "vitest";
import { DEFAULT_ACCESS_POLICY, DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";
import { accessImpactNotes, billingImpactNotes, contractImpactNotes, templateUsesCancellationVariables } from "@/features/academy/impact-notes";
import { resolveRankConfigs } from "@/features/academy/belt-rules";
import { eligibilityImpactText } from "@/features/academy/impact-notes";
import { countEligibilityChange, countLockedStudents } from "@/features/academy/impact-rules";
import { applyRankChanges, planRankChanges } from "@/features/academy/rank-changes";
import { DEFAULT_ELIGIBILITY_EXAM, evaluateExamEligibility, type EligibilityContext } from "@/features/exams/eligibility-rules";
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

describe("aviso de impacto da elegibilidade", () => {
  const row = (studentId: string, canTakeExam: boolean) => ({ studentId, canTakeExam });

  it("conta quem deixa de estar elegível e quem passa a estar", () => {
    const before = [row("a", true), row("b", true), row("c", false), row("d", false), row("e", true)];
    const after = [row("a", false), row("b", true), row("c", true), row("d", false), row("e", false)];
    expect(countEligibilityChange(before, after)).toEqual({ total: 5, leaving: 2, entering: 1 });
  });

  it("sem mudança, nada entra nem sai", () => {
    const same = [row("a", true), row("b", false)];
    expect(countEligibilityChange(same, same)).toEqual({ total: 2, leaving: 0, entering: 0 });
  });

  it("aluno que só existe na proposta e é elegível conta como quem passa a estar", () => {
    expect(countEligibilityChange([], [row("novo", true)])).toEqual({ total: 1, leaving: 0, entering: 1 });
  });

  it("escreve o aviso com singular e plural", () => {
    expect(eligibilityImpactText({ leaving: 12, entering: 3 })).toBe("12 alunos deixam de estar elegíveis e 3 passam a estar.");
    expect(eligibilityImpactText({ leaving: 1, entering: 1 })).toBe("1 aluno deixa de estar elegível e 1 passa a estar.");
    expect(eligibilityImpactText({ leaving: 0, entering: 0 })).toBe("0 alunos deixam de estar elegíveis e 0 passam a estar.");
  });

  it("calcula o impacto de ponta a ponta: avaliação atual x avaliação com o tempo proposto", () => {
    const ranks = resolveRankConfigs(null);
    const proposed = applyRankChanges(ranks, planRankChanges(ranks, [{ rank_key: "gub-10", revision: 0, data: { min_days: 200 } }]).changes);
    const student = (id: string, startedAt: string, presences: number) => ({
      studentId: id,
      fullName: id,
      currentRankKey: "gub-10",
      beltStartDate: startedAt,
      presencesSinceLastBelt: presences,
      hasOverdueCharges: false,
      referenceDate: "2026-11-18"
    });
    const students = [student("a", "2026-01-01", 30), student("b", "2026-08-01", 30), student("c", "2026-10-01", 30)];
    const evaluate = (context: EligibilityContext) => students.map((input) => evaluateExamEligibility(input, context));
    const before = evaluate({ ranks, exam: DEFAULT_ELIGIBILITY_EXAM });
    // a (321 dias) e b (109 dias) cumprem 90 dias; com 200 dias só a continua apta.
    expect(before.filter((item) => item.canTakeExam).map((item) => item.studentId)).toEqual(["a", "b"]);
    const impact = countEligibilityChange(before, evaluate({ ranks: proposed, exam: DEFAULT_ELIGIBILITY_EXAM }));
    expect(impact).toEqual({ total: 3, leaving: 1, entering: 0 });
    // Diminuir o tempo faz "c" (48 dias) passar a estar apto.
    const lower = applyRankChanges(ranks, planRankChanges(ranks, [{ rank_key: "gub-10", revision: 0, data: { min_days: 30 } }]).changes);
    expect(countEligibilityChange(before, evaluate({ ranks: lower, exam: DEFAULT_ELIGIBILITY_EXAM }))).toEqual({ total: 3, leaving: 0, entering: 1 });
  });

  it("a política de exame também muda quem pode: bloquear por atraso tira, liberar põe", () => {
    const ranks = resolveRankConfigs(null);
    const late = { studentId: "x", fullName: "x", currentRankKey: "gub-10", beltStartDate: "2026-01-01", presencesSinceLastBelt: 40, hasOverdueCharges: true, referenceDate: "2026-11-18" };
    const blocked = [evaluateExamEligibility(late, { ranks, exam: DEFAULT_ELIGIBILITY_EXAM })];
    const released = [evaluateExamEligibility(late, { ranks, exam: { ...DEFAULT_ELIGIBILITY_EXAM, block_on_overdue: false } })];
    expect(countEligibilityChange(blocked, released)).toEqual({ total: 1, leaving: 0, entering: 1 });
    expect(countEligibilityChange(released, blocked)).toEqual({ total: 1, leaving: 1, entering: 0 });
  });
});
