import type { AccessPolicy } from "@/features/academy/defaults";
import { evaluateStudentAppAccess } from "@/features/billing/access-lock-rules";
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
