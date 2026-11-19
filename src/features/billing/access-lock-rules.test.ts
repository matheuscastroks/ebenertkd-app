import { describe, expect, it } from "vitest";
import { accessGrantedSentence, accessStatusLabel, evaluateStudentAppAccess } from "@/features/billing/access-lock-rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";

const baseEnrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  $id: "enr-1",
  $sequence: "1",
  $createdAt: "2026-01-01T12:00:00.000Z",
  $updatedAt: "2026-01-01T12:00:00.000Z",
  $permissions: [],
  $databaseId: "ebenertkd",
  $tableId: "enrollments",
  student_id: "stu-1",
  status: "active",
  revision: 1,
  created_at: "2026-01-01T12:00:00.000Z",
  updated_at: "2026-01-01T12:00:00.000Z",
  ...overrides,
});

const makeCharge = (overrides: Partial<Charge> = {}): Charge => ({
  $id: "chg-1",
  $sequence: "1",
  $createdAt: "2026-10-01T12:00:00.000Z",
  $updatedAt: "2026-10-01T12:00:00.000Z",
  $permissions: [],
  $databaseId: "ebenertkd",
  $tableId: "charges",
  enrollment_id: "enr-1",
  student_id: "stu-1",
  charge_type: "monthly_fee",
  competence: "2026-10",
  origin_id: "ctr-1",
  amount_cents: 15000,
  due_date: "2026-10-10T12:00:00.000Z",
  status: "paid",
  description: "Mensalidade 2026-10",
  created_at: "2026-10-01T12:00:00.000Z",
  updated_at: "2026-10-01T12:00:00.000Z",
  ...overrides,
});

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  $id: "pay-1",
  $sequence: "1",
  $createdAt: "2026-10-10T12:00:00.000Z",
  $updatedAt: "2026-10-10T12:00:00.000Z",
  $permissions: [],
  $databaseId: "ebenertkd",
  $tableId: "payments",
  charge_id: "chg-1",
  method: "pix_proof",
  amount_cents: 15000,
  paid_at: "2026-10-10T12:00:00.000Z",
  status: "confirmed",
  recorded_by_account_id: "admin-1",
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
  ...overrides,
});

describe("access-lock-rules (ciclo de 30 dias após pagamento)", () => {
  it("nunca bloqueia alunos em fase de matrícula ou assinatura", () => {
    const result = evaluateStudentAppAccess({
      enrollment: baseEnrollment({ status: "awaiting_signature" }),
      charges: [makeCharge({ status: "overdue", due_date: "2026-09-10T12:00:00.000Z" })],
      payments: [],
      referenceDate: "2026-11-18",
    });
    expect(result.locked).toBe(false);
    expect(result.status).toBe("not_applicable");
  });

  it("mantém acesso ativo nos 30 dias após pagamento confirmado e avisa nos últimos 5 dias", () => {
    const charge = makeCharge({ $id: "chg-1", status: "paid" });
    const payment = makePayment({ charge_id: "chg-1", paid_at: "2026-10-25T12:00:00.000Z" });

    const active = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [charge],
      payments: [payment],
      referenceDate: "2026-11-10",
    });
    expect(active.locked).toBe(false);
    expect(active.status).toBe("active");
    expect(active.accessValidUntil).toBe("2026-11-24");
    expect(active.daysRemaining).toBe(14);

    const expiring = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [charge],
      payments: [payment],
      referenceDate: "2026-11-21",
    });
    expect(expiring.locked).toBe(false);
    expect(expiring.status).toBe("expiring_soon");
    expect(expiring.daysRemaining).toBe(3);
  });

  it("bloqueia o app no 31º dia após o último pagamento sem nova confirmação", () => {
    const charge = makeCharge({ $id: "chg-1", status: "paid" });
    const payment = makePayment({ charge_id: "chg-1", paid_at: "2026-10-10T12:00:00.000Z" });

    const locked = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [charge],
      payments: [payment],
      referenceDate: "2026-11-10",
    });
    expect(locked.locked).toBe(true);
    expect(locked.status).toBe("locked");
    expect(locked.reason).toBe("monthly_cycle_expired");
    expect(locked.accessValidUntil).toBe("2026-11-09");
    expect(locked.daysOverdue).toBe(1);
  });

  it("desbloqueia imediatamente quando há comprovante mensal em conferência", () => {
    const oldPaid = makeCharge({ $id: "chg-1", status: "paid" });
    const newProof = makeCharge({
      $id: "chg-2",
      competence: "2026-11",
      due_date: "2026-11-10T12:00:00.000Z",
      status: "proof_under_review",
    });
    const payment = makePayment({ charge_id: "chg-1", paid_at: "2026-10-05T12:00:00.000Z" });

    const result = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [oldPaid, newProof],
      payments: [payment],
      referenceDate: "2026-11-18",
    });
    expect(result.locked).toBe(false);
    expect(result.status).toBe("proof_under_review");
  });

  it("respeita liberação temporária manual concedida pelo professor", () => {
    const result = evaluateStudentAppAccess({
      enrollment: baseEnrollment({ access_override_until: "2026-11-30T23:59:59.000Z" }),
      charges: [makeCharge({ status: "overdue", due_date: "2026-10-10T12:00:00.000Z" })],
      payments: [],
      referenceDate: "2026-11-18",
    });
    expect(result.locked).toBe(false);
    expect(result.status).toBe("override");
    expect(result.accessValidUntil).toBe("2026-11-30");
  });

  it("bloqueia aluno ativo sem nenhum pagamento confirmado e com mensalidade vencida", () => {
    const result = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [makeCharge({ status: "pending", due_date: "2026-11-05T12:00:00.000Z" })],
      payments: [],
      referenceDate: "2026-11-18",
    });
    expect(result.locked).toBe(true);
    expect(result.reason).toBe("overdue_without_payment");
    expect(result.daysOverdue).toBe(13);
  });

  it("ignora pagamentos estornados e taxas de exame ao calcular o ciclo mensal", () => {
    const examCharge = makeCharge({
      $id: "chg-exam",
      charge_type: "exam_fee",
      status: "paid",
    });
    const monthlyOverdue = makeCharge({
      $id: "chg-m1",
      charge_type: "monthly_fee",
      status: "overdue",
      due_date: "2026-10-10T12:00:00.000Z",
    });
    const reversedPayment = makePayment({
      $id: "pay-rev",
      charge_id: "chg-m1",
      status: "reversed",
      paid_at: "2026-11-15T12:00:00.000Z",
    });
    const examPayment = makePayment({
      $id: "pay-exam",
      charge_id: "chg-exam",
      status: "confirmed",
      paid_at: "2026-11-15T12:00:00.000Z",
    });

    const result = evaluateStudentAppAccess({
      enrollment: baseEnrollment(),
      charges: [examCharge, monthlyOverdue],
      payments: [reversedPayment, examPayment],
      referenceDate: "2026-11-18",
    });
    expect(result.locked).toBe(true);
  });

  describe("política da academia", () => {
    const paidLongAgo = () => ({
      charges: [makeCharge({ status: "paid" })],
      payments: [makePayment({ charge_id: "chg-1", status: "confirmed", paid_at: "2026-10-10T12:00:00.000Z" })],
    });

    it("sem política usa o padrão atual: 30 dias de acesso", () => {
      const state = evaluateStudentAppAccess({ enrollment: baseEnrollment(), ...paidLongAgo(), referenceDate: "2026-11-18" });
      expect(state).toMatchObject({ locked: true, windowDays: 30, enabled: true });
    });

    it("janela maior mantém o acesso", () => {
      const state = evaluateStudentAppAccess({
        enrollment: baseEnrollment(),
        ...paidLongAgo(),
        referenceDate: "2026-11-18",
        policy: { enabled: true, window_days: 45, warning_days: 5 },
      });
      expect(state).toMatchObject({ locked: false, windowDays: 45 });
    });

    it("bloqueio desligado nunca bloqueia, mesmo com mensalidade em atraso", () => {
      const state = evaluateStudentAppAccess({
        enrollment: baseEnrollment(),
        charges: [makeCharge({ status: "pending", due_date: "2026-09-10T12:00:00.000Z" })],
        payments: [],
        referenceDate: "2026-11-18",
        policy: { enabled: false, window_days: 30, warning_days: 5 },
      });
      expect(state).toMatchObject({ locked: false, status: "not_applicable", enabled: false });
      expect(accessStatusLabel(state)).toBe("Bloqueio por mensalidade desativado");
    });

    it("os textos acompanham a janela configurada", () => {
      expect(accessStatusLabel({ status: "active", windowDays: 45, enabled: true })).toBe("Ciclo ativo (45 dias)");
      expect(accessGrantedSentence({ enabled: true, window_days: 45 })).toBe(" Seu acesso ao aplicativo está liberado por 45 dias.");
      expect(accessGrantedSentence({ enabled: false, window_days: 45 })).toBe("");
    });
  });
});
