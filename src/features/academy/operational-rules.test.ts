import { describe, expect, it } from "vitest";
import { evaluateStudentRetention } from "@/features/classes/retention-rules";
import { classifyContractRenewalBucket, renewalEvent } from "@/features/contracts/rules";
import { shouldGenerateCompetence } from "@/features/billing/rules";
import { DEFAULT_BADGES, DEFAULT_COMPLIANCE_POLICY, DEFAULT_RETENTION_POLICY, type BadgeDefinition } from "@/features/academy/defaults";
import { complianceImpactNotes, notificationsImpactNotes } from "@/features/academy/impact-notes";
import { countComplianceChange, countRetentionChange } from "@/features/academy/impact-rules";
import { PolicyValidationError, parsePolicyData, parsePolicyInput } from "@/features/academy/schemas";
import { paymentReminderCopy, paymentReminderStage } from "@/features/notifications/payment-reminders";
import { buildStudentConsistencyReport } from "@/features/students/achievements-rules";
import { evaluateStudentCompliance, summarizeCompliance } from "@/features/students/compliance-rules";
import { computeParqExpirationDate, evaluateParqStatus } from "@/features/students/parq-rules";
import type { ParqSubmission, Student, StudentDocument } from "@/features/students/types";

const student = { $id: "s1", profile_id: "p1", full_name: "Aluno de Teste", status: "active" } as unknown as Student;
const doc = (updated_at: string) => ({ $id: "d1", student_id: "s1", document_type: "medical_certificate", status: "approved", updated_at, created_at: updated_at }) as unknown as StudentDocument;
const parq = (signed_at: string, expires_at = "2099-01-01T00:00:00.000Z") =>
  ({ $id: "q1", student_id: "s1", signed_at, expires_at, answers_json: "{}", has_yes_answer: false, requires_medical_certificate: false, signer_name: "Ana", signer_role: "adult_student" }) as unknown as ParqSubmission;

describe("retenção por política", () => {
  const base = { studentId: "s1", profileId: "p1", fullName: "Lucas", enrollmentCreatedAt: "2026-08-01T12:00:00Z", referenceDate: "2026-11-18" };
  const entries = [
    { lessonDate: "2026-11-16", status: "absent" as const },
    { lessonDate: "2026-11-13", status: "absent" as const },
    { lessonDate: "2026-11-09", status: "present" as const }
  ];

  it("com a política padrão 2 faltas seguidas é atenção", () => {
    expect(evaluateStudentRetention({ ...base, attendanceEntries: entries }).riskLevel).toBe("warning");
  });

  it("limiares customizados mudam o nível e a janela entra no texto", () => {
    const strict = { ...DEFAULT_RETENTION_POLICY, critical_consecutive_absences: 2, warning_consecutive_absences: 1 };
    expect(evaluateStudentRetention({ ...base, attendanceEntries: entries, policy: strict }).riskLevel).toBe("critical");
    const lenient = { ...DEFAULT_RETENTION_POLICY, warning_consecutive_absences: 4, warning_days_without_presence: 60, critical_days_without_presence: 90, critical_consecutive_absences: 5, warning_min_lessons: 10, critical_min_lessons: 10 };
    expect(evaluateStudentRetention({ ...base, attendanceEntries: entries, policy: lenient }).riskLevel).toBe("healthy");

    const window = { ...DEFAULT_RETENTION_POLICY, window_days: 10, critical_min_lessons: 2, critical_rate_pct: 50 };
    const result = evaluateStudentRetention({
      ...base,
      attendanceEntries: [{ lessonDate: "2026-11-17", status: "absent" }, { lessonDate: "2026-11-14", status: "present" }, { lessonDate: "2026-11-12", status: "absent" }, { lessonDate: "2026-11-11", status: "absent" }],
      policy: { ...window, critical_consecutive_absences: 9, warning_consecutive_absences: 8 }
    });
    expect(result.windowDays).toBe(10);
    expect(result.riskLevel).toBe("critical");
    expect(result.riskReason).toContain("últimos 10 dias");
  });
});

describe("PAR-Q e atestado por política", () => {
  it("validade do PAR-Q diferente de 365 vale a partir da assinatura", () => {
    const signed = parq("2026-06-01T12:00:00.000Z");
    expect(evaluateParqStatus(signed, "2026-11-18").status).toBe("valid");
    const short = { ...DEFAULT_COMPLIANCE_POLICY, parq_validity_days: 180 };
    const assessment = evaluateParqStatus(signed, "2026-11-18", short);
    expect(assessment.expiresAt).toBe("2026-11-28");
    expect(assessment.status).toBe("expiring_soon");
    expect(evaluateParqStatus(signed, "2026-12-05", short).status).toBe("expired");
    expect(evaluateParqStatus(signed, "2027-12-01", { ...DEFAULT_COMPLIANCE_POLICY, parq_validity_days: 730 }).status).toBe("valid");
  });

  it("a data de vencimento gravada na assinatura usa a validade informada", () => {
    expect(computeParqExpirationDate("2026-06-01T00:00:00.000Z")).toBe("2027-06-01T00:00:00.000Z");
    expect(computeParqExpirationDate("2026-06-01T00:00:00.000Z", 180)).toBe("2026-11-28T00:00:00.000Z");
  });

  it("validade do atestado e rótulo da janela acompanham a política", () => {
    const input = { student, documents: [doc("2026-01-01T12:00:00Z")], referenceDate: "2026-11-18" };
    expect(evaluateStudentCompliance(input).medicalStatus).toBe("valid");
    const six = { ...DEFAULT_COMPLIANCE_POLICY, medical_validity_days: 180 };
    expect(evaluateStudentCompliance({ ...input, policy: six }).medicalStatus).toBe("expired");
    const wide = { ...DEFAULT_COMPLIANCE_POLICY, medical_expiring_window_days: 90 };
    const rows = [evaluateStudentCompliance({ ...input, policy: wide })];
    expect(rows[0].medicalStatus).toBe("expiring_soon");
    expect(summarizeCompliance(rows, wide).breakdown.find((item) => item.key === "expiring_soon")?.label).toBe("Vence em 90d");
    expect(summarizeCompliance(rows).breakdown.find((item) => item.key === "expiring_soon")?.label).toBe("Vence em 30d");
  });
});

describe("conquistas por política", () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({ lessonDate: `2026-11-${String(index + 1).padStart(2, "0")}`, status: "present" as const }));

  it("meta e título editáveis; a métrica é fixa", () => {
    const badges: BadgeDefinition[] = [
      { id: "lessons-10", title: "Dez treinos", description: "Dez presenças.", metric: "total_presences", target: 10 },
      { id: "year-2", title: "Dois anos", description: "24 meses.", metric: "tenure_months", target: 24 }
    ];
    const report = buildStudentConsistencyReport({ entries, beltHistory: [], startedAt: "2025-01-01T12:00:00Z", referenceDate: "2026-11-18", badges });
    expect(report.badges.map((badge) => badge.title)).toEqual(["Dez treinos", "Dois anos"]);
    expect(report.badges[0]).toMatchObject({ unlocked: true, currentValue: 10, targetValue: 10 });
    expect(report.badges[1]).toMatchObject({ unlocked: false, targetValue: 24 });
    expect(report.unlockedCount).toBe(1);
  });

  it("sem política usa as conquistas padrão", () => {
    expect(buildStudentConsistencyReport({ entries: [], beltHistory: [], referenceDate: "2026-11-18" }).badges).toHaveLength(DEFAULT_BADGES.length);
  });
});

describe("régua de lembretes de pagamento", () => {
  const due = "2026-10-10T12:00:00.000Z";

  it("a régua padrão mantém as etapas de sempre", () => {
    expect(paymentReminderStage(due, "2026-10-07")).toBe("due_minus_3");
    expect(paymentReminderStage(due, "2026-10-10")).toBe("due_today");
    expect(paymentReminderStage(due, "2026-10-13")).toBe("overdue_plus_3");
    expect(paymentReminderStage(due, "2026-10-20")).toBe("overdue_weekly_1");
    expect(paymentReminderStage(due, "2026-10-27")).toBe("overdue_weekly_2");
  });

  it("régua customizada: dias, semanal a partir de outro dia e textos", () => {
    const policy = { payment_stages: [-5, -1, 0, 2], overdue_weekly_from_day: 7 };
    expect(paymentReminderStage(due, "2026-10-05", policy)).toBe("due_minus_5");
    expect(paymentReminderStage(due, "2026-10-09", policy)).toBe("due_minus_1");
    expect(paymentReminderStage(due, "2026-10-07", policy)).toBeNull();
    expect(paymentReminderStage(due, "2026-10-12", policy)).toBe("overdue_plus_2");
    expect(paymentReminderStage(due, "2026-10-17", policy)).toBe("overdue_weekly_1");
    expect(paymentReminderStage(due, "2026-10-24", policy)).toBe("overdue_weekly_2");
    expect(paymentReminderStage(due, "2026-10-13", policy)).toBeNull();
    expect(paymentReminderCopy("due_minus_5", "Mensalidade 2026-10").body).toBe("Mensalidade 2026-10 vence em 5 dias.");
    expect(paymentReminderCopy("due_minus_1", "Mensalidade 2026-10").body).toBe("Mensalidade 2026-10 vence em 1 dia.");
    expect(paymentReminderCopy("overdue_plus_2", "Mensalidade 2026-10").body).toBe("Mensalidade 2026-10 está em atraso há 2 dias.");
  });
});

describe("avisos de renovação e geração da mensalidade", () => {
  it("renewalEvent usa os dias da política", () => {
    expect(renewalEvent("2027-01-31", "2026-12-17", [45, 15])).toEqual({ kind: "reminder", days: 45 });
    expect(renewalEvent("2027-01-31", "2027-01-01", [45, 15])).toBeNull();
    expect(renewalEvent("2027-01-31", "2027-01-01")).toEqual({ kind: "reminder", days: 30 });
  });

  it("a esteira de renovação continua fixa em 7/30/60/90", () => {
    expect(classifyContractRenewalBucket("2027-01-31", "2027-01-01").bucket).toBe("due_30d");
  });

  it("a antecedência de geração da mensalidade é parâmetro", () => {
    expect(shouldGenerateCompetence("2026-07", "2026-06-24")).toBe(true);
    expect(shouldGenerateCompetence("2026-07", "2026-06-24", 3)).toBe(false);
    expect(shouldGenerateCompetence("2026-07", "2026-06-28", 3)).toBe(true);
    expect(shouldGenerateCompetence("2026-07", "2026-06-10", 21)).toBe(true);
  });
});

describe("validação das novas seções", () => {
  it("retenção: nível de atenção precisa começar antes do crítico", () => {
    expect(() => parsePolicyInput("retention", { warning_consecutive_absences: 5 })).toThrow(PolicyValidationError);
    expect(parsePolicyInput("retention", { critical_consecutive_absences: 4 }).critical_consecutive_absences).toBe(4);
  });

  it("conformidade: lembretes ordenados e não anteriores à validade", () => {
    expect(parsePolicyInput("compliance", { parq_reminder_days: [0, 14, 60] }).parq_reminder_days).toEqual([60, 14, 0]);
    expect(() => parsePolicyInput("compliance", { parq_validity_days: 30, parq_reminder_days: [60] })).toThrow(PolicyValidationError);
    expect(parsePolicyInput("compliance", { parq_reminder_days: [] }).parq_reminder_days).toEqual([]);
  });

  it("notificações: régua ordenada e semanal depois do último lembrete", () => {
    expect(parsePolicyInput("notifications", { payment_stages: [3, -3, 0] }).payment_stages).toEqual([-3, 0, 3]);
    expect(() => parsePolicyInput("notifications", { payment_stages: [3, 12] })).toThrow(PolicyValidationError);
  });

  it("conquistas: ids únicos e meta mínima de 1", () => {
    const badge = { id: "a-1", title: "Teste", description: "", metric: "total_presences", target: 5 };
    expect(parsePolicyInput("gamification", { badges: [badge] }).badges).toHaveLength(1);
    expect(() => parsePolicyInput("gamification", { badges: [badge, badge] })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("gamification", { badges: [{ ...badge, target: 0 }] })).toThrow(PolicyValidationError);
    expect(() => parsePolicyInput("gamification", { badges: [{ ...badge, metric: "other" }] })).toThrow(PolicyValidationError);
  });

  it("leitura tolerante: dado inválido volta ao default sem lançar", () => {
    expect(parsePolicyData("compliance", "{quebrado").parq_validity_days).toBe(365);
    expect(parsePolicyData("gamification", JSON.stringify({ badges: "x" })).badges).toHaveLength(DEFAULT_BADGES.length);
    expect(parsePolicyData("retention", JSON.stringify({ window_days: 45, critical_rate_pct: "x" }))).toMatchObject({ window_days: 45, critical_rate_pct: 50 });
  });
});

describe("avisos de impacto das regras operacionais", () => {
  const row = (studentId: string, medicalStatus: string, parqStatus: string) => ({ studentId, medicalStatus, parqStatus });

  it("conta quantos alunos ficam irregulares com a nova validade", () => {
    const before = [row("a", "valid", "valid"), row("b", "valid", "valid"), row("c", "expired", "valid"), row("d", "missing", "missing")];
    const after = [row("a", "expired", "valid"), row("b", "valid", "expired"), row("c", "valid", "valid"), row("d", "missing", "missing")];
    expect(countComplianceChange(before, after)).toEqual({ total: 4, irregularNow: 1, irregularProposed: 2, becomingIrregular: 2, becomingRegular: 1 });
  });

  it("conta alunos por nível de risco antes e depois", () => {
    const before = [{ riskLevel: "healthy" as const }, { riskLevel: "healthy" as const }, { riskLevel: "warning" as const }];
    const after = [{ riskLevel: "warning" as const }, { riskLevel: "critical" as const }, { riskLevel: "warning" as const }];
    expect(countRetentionChange(before, after)).toEqual({
      total: 3,
      before: { critical: 0, warning: 1, healthy: 2 },
      after: { critical: 1, warning: 2, healthy: 0 }
    });
  });

  it("textos avisam sobre validade retroativa e sobre publicar a Function", () => {
    const after = { ...DEFAULT_COMPLIANCE_POLICY, parq_validity_days: 180, parq_reminder_days: [14, 0] };
    const notes = complianceImpactNotes(DEFAULT_COMPLIANCE_POLICY, after).join(" ");
    expect(notes).toContain("180 dias");
    expect(notes).toContain("já assinados");
    expect(notes).toContain("publicar");
    const reminders = notificationsImpactNotes({ payment_stages: [-3, 0, 3], overdue_weekly_from_day: 10, due_soon_alert_days: 7 }, { payment_stages: [-2, 0], overdue_weekly_from_day: 10, due_soon_alert_days: 7 });
    expect(reminders.join(" ")).toContain("Function");
  });
});
