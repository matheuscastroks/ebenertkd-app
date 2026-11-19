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

export type ComplianceImpact = {
  /** Alunos avaliados. */
  total: number;
  /** Atestado ou PAR-Q vencidos hoje (política atual). */
  irregularNow: number;
  /** Atestado ou PAR-Q vencidos com a política proposta. */
  irregularProposed: number;
  /** Estavam regulares e passam a ter atestado ou PAR-Q vencido. */
  becomingIrregular: number;
  /** Estavam irregulares e passam a ficar regulares. */
  becomingRegular: number;
};

type ComplianceLike = { studentId: string; medicalStatus: string; parqStatus: string };

/** Irregular = atestado médico ou PAR-Q vencido (quem nunca enviou é outra pendência, que a validade não altera). */
export const isIrregularCompliance = (row: Pick<ComplianceLike, "medicalStatus" | "parqStatus">) => row.medicalStatus === "expired" || row.parqStatus === "expired";

/** "N alunos ficariam irregulares com a nova validade de atestado/PAR-Q": compara a avaliação atual com a proposta (pura). */
export function countComplianceChange(before: readonly ComplianceLike[], after: readonly ComplianceLike[]): ComplianceImpact {
  const wasIrregular = new Map(before.map((row) => [row.studentId, isIrregularCompliance(row)]));
  let becomingIrregular = 0;
  let becomingRegular = 0;
  let irregularProposed = 0;
  for (const row of after) {
    const now = isIrregularCompliance(row);
    const was = wasIrregular.get(row.studentId) ?? false;
    if (now) irregularProposed += 1;
    if (!was && now) becomingIrregular += 1;
    if (was && !now) becomingRegular += 1;
  }
  return { total: after.length, irregularNow: [...wasIrregular.values()].filter(Boolean).length, irregularProposed, becomingIrregular, becomingRegular };
}

export type RetentionLevelCounts = { critical: number; warning: number; healthy: number };
export type RetentionImpact = { total: number; before: RetentionLevelCounts; after: RetentionLevelCounts };

export function countRetentionLevels(rows: ReadonlyArray<{ riskLevel: "critical" | "warning" | "healthy" }>): RetentionLevelCounts {
  const counts: RetentionLevelCounts = { critical: 0, warning: 0, healthy: 0 };
  for (const row of rows) counts[row.riskLevel] += 1;
  return counts;
}

/** "Nova contagem por nível de risco": quantos alunos em cada nível hoje e com os limiares propostos (pura). */
export function countRetentionChange(
  before: ReadonlyArray<{ riskLevel: "critical" | "warning" | "healthy" }>,
  after: ReadonlyArray<{ riskLevel: "critical" | "warning" | "healthy" }>
): RetentionImpact {
  return { total: after.length, before: countRetentionLevels(before), after: countRetentionLevels(after) };
}
