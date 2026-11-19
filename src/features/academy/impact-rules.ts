import type { AccessPolicy } from "@/features/academy/defaults";
import { evaluateStudentAppAccess } from "@/features/billing/access-lock-rules";
import type { StudentEligibilityAssessment } from "@/features/exams/eligibility-rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";

/** Quantos alunos ficariam com o acesso bloqueado hoje sob uma política (pura: recebe os dados). */
export function countLockedStudents(input: {
  enrollments: Enrollment[];
  charges: Charge[];
  payments: Payment[];
  policy: AccessPolicy;
  referenceDate: string;
}): number {
  const chargesByStudent = new Map<string, Charge[]>();
  for (const charge of input.charges) {
    const list = chargesByStudent.get(charge.student_id) ?? [];
    list.push(charge);
    chargesByStudent.set(charge.student_id, list);
  }
  const paymentsByCharge = new Map<string, Payment[]>();
  for (const payment of input.payments) {
    const list = paymentsByCharge.get(payment.charge_id) ?? [];
    list.push(payment);
    paymentsByCharge.set(payment.charge_id, list);
  }
  let locked = 0;
  for (const enrollment of input.enrollments) {
    const charges = chargesByStudent.get(enrollment.student_id) ?? [];
    const payments = charges.flatMap((charge) => paymentsByCharge.get(charge.$id) ?? []);
    const state = evaluateStudentAppAccess({ enrollment, charges, payments, referenceDate: input.referenceDate, policy: input.policy });
    if (state.locked) locked += 1;
  }
  return locked;
}

export type EligibilityImpact = {
  /** Alunos avaliados. */
  total: number;
  /** Podiam prestar exame e deixam de poder. */
  leaving: number;
  /** Não podiam e passam a poder. */
  entering: number;
};

/** "N alunos deixam de estar elegíveis e M passam a estar": compara a avaliação atual com a proposta (pura). */
export function countEligibilityChange(
  before: ReadonlyArray<Pick<StudentEligibilityAssessment, "studentId" | "canTakeExam">>,
  after: ReadonlyArray<Pick<StudentEligibilityAssessment, "studentId" | "canTakeExam">>
): EligibilityImpact {
  const wasEligible = new Map(before.map((row) => [row.studentId, row.canTakeExam]));
  let leaving = 0;
  let entering = 0;
  for (const row of after) {
    const was = wasEligible.get(row.studentId) ?? false;
    if (was && !row.canTakeExam) leaving += 1;
    if (!was && row.canTakeExam) entering += 1;
  }
  return { total: after.length, leaving, entering };
}
