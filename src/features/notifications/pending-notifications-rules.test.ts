import { describe, expect, it } from "vitest";
import { buildPendingNotificationSpecs } from "@/features/notifications/pending-notifications-rules";
import type { Charge } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import type { Enrollment, Student } from "@/features/students/types";

const baseStudent = {
  $id: "stu-1",
  profile_id: "prof-1",
  full_name: "Lucas Silva",
  status: "active",
} as Student;

const activeEnrollment = {
  $id: "enr-1",
  student_id: "stu-1",
  status: "active",
} as Enrollment;

const links = {
  enrollment: "/aluno/matricula",
  parq: "/aluno/parq",
  billing: "/aluno/financeiro",
  contract: (id: string) => `/aluno/contratos/${id}`,
};

describe("buildPendingNotificationSpecs", () => {
  it("gera notificações automáticas para PAR-Q pendente, mensalidade vencida e contrato aguardando assinatura", () => {
    const specs = buildPendingNotificationSpecs({
      student: baseStudent,
      enrollment: activeEnrollment,
      parq: {
        status: "missing",
        submissionId: null,
        signedAt: null,
        expiresAt: null,
        daysUntilExpiration: null,
        hasYesAnswer: false,
        requiresMedicalCertificate: false,
        yesQuestionNumbers: [],
        signerName: null,
        signerRole: null,
        answers: {},
      },
      charges: [
        {
          $id: "chg-1",
          description: "Mensalidade 2026-11",
          amount_cents: 15000,
          due_date: "2026-11-10T12:00:00.000Z",
          status: "overdue",
        } as Charge,
      ],
      contracts: [{ $id: "ctr-1", status: "pending_signature" } as Contract],
      access: {
        locked: true,
        status: "locked",
        reason: "monthly_cycle_expired",
        lastPaidAt: "2026-10-05",
        accessValidUntil: "2026-11-04",
        overrideUntil: null,
        daysRemaining: -14,
        daysOverdue: 14,
      },
      links,
      isGuardianView: false,
      includeFinancial: true,
      referenceDate: "2026-11-18",
    });

    expect(specs.map((item) => item.dedupeKey)).toEqual([
      "pending:contract-signature:ctr-1",
      "pending:parq-missing:stu-1",
      "pending:access-locked:stu-1:2026-11-04",
      "pending:charge-overdue:chg-1",
    ]);
  });

  it("nunca gera notificações financeiras, de contrato ou de assinatura para menor", () => {
    const specs = buildPendingNotificationSpecs({
      student: baseStudent,
      enrollment: activeEnrollment,
      parq: {
        status: "missing",
        submissionId: null,
        signedAt: null,
        expiresAt: null,
        daysUntilExpiration: null,
        hasYesAnswer: false,
        requiresMedicalCertificate: false,
        yesQuestionNumbers: [],
        signerName: null,
        signerRole: null,
        answers: {},
      },
      charges: [
        {
          $id: "chg-1",
          description: "Mensalidade 2026-11",
          amount_cents: 15000,
          due_date: "2026-11-10T12:00:00.000Z",
          status: "overdue",
        } as Charge,
      ],
      contracts: [{ $id: "ctr-1", status: "pending_signature" } as Contract],
      access: {
        locked: true,
        status: "locked",
        reason: "monthly_cycle_expired",
        lastPaidAt: "2026-10-05",
        accessValidUntil: "2026-11-04",
        overrideUntil: null,
        daysRemaining: -14,
        daysOverdue: 14,
      },
      links,
      isGuardianView: false,
      includeFinancial: false,
      referenceDate: "2026-11-18",
    });

    expect(specs).toEqual([]);
  });

  it("gera notificação de ficha em rascunho quando o cadastro ainda não foi enviado", () => {
    const specs = buildPendingNotificationSpecs({
      student: { ...baseStudent, status: "draft" },
      enrollment: { ...activeEnrollment, status: "draft" },
      parq: null,
      charges: [],
      contracts: [],
      access: null,
      links,
      isGuardianView: true,
      includeFinancial: true,
      referenceDate: "2026-11-18",
    });

    expect(specs).toHaveLength(1);
    expect(specs[0].dedupeKey).toBe("pending:enrollment-draft:stu-1");
    expect(specs[0].title).toContain("Lucas:");
  });
});
