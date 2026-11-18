import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type MedicalComplianceStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "pending_review"
  | "missing";

export const MEDICAL_VALIDITY_DAYS = 365;
export const MEDICAL_EXPIRING_WINDOW_DAYS = 30;

export type StudentComplianceAssessment = {
  studentId: string;
  profileId: string;
  fullName: string;
  currentBelt: string | null;
  gub: number | null;
  trainingClassId: string | null;
  trainingClassName: string;
  photoDocumentId: string | null;
  whatsapp: string | null;
  medicalStatus: MedicalComplianceStatus;
  medicalDocumentId: string | null;
  medicalIssuedAt: string | null;
  medicalExpiresAt: string | null;
  daysUntilExpiration: number | null;
  hasApprovedPhoto: boolean;
  hasEmergencyContact: boolean;
};

export type ComplianceSummary = {
  totalActive: number;
  validCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  pendingReviewCount: number;
  missingCount: number;
  complianceRatePct: number;
  breakdown: Array<{ key: MedicalComplianceStatus; label: string; count: number }>;
};

const STATUS_PRIORITY: Record<MedicalComplianceStatus, number> = {
  expired: 0,
  missing: 1,
  pending_review: 2,
  expiring_soon: 3,
  valid: 4,
};

function addDaysIso(isoDay: string, days: number): string {
  const base = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(base)) return isoDay;
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

export function evaluateStudentCompliance(input: {
  student: Student;
  enrollment?: Enrollment | null;
  documents: StudentDocument[];
  trainingClassName?: string | null;
  referenceDate?: string;
}): StudentComplianceAssessment {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const medCert = input.documents.find((doc) => doc.document_type === "medical_certificate");
  const photo = input.documents.find((doc) => doc.document_type === "profile_photo");

  let medicalStatus: MedicalComplianceStatus = "missing";
  let medicalIssuedAt: string | null = null;
  let medicalExpiresAt: string | null = null;
  let daysUntilExpiration: number | null = null;

  if (medCert) {
    if (medCert.status === "pending") {
      medicalStatus = "pending_review";
      medicalIssuedAt = (medCert.updated_at || medCert.created_at).slice(0, 10);
    } else if (medCert.status === "approved") {
      medicalIssuedAt = (medCert.updated_at || medCert.created_at).slice(0, 10);
      medicalExpiresAt = addDaysIso(medicalIssuedAt, MEDICAL_VALIDITY_DAYS);
      daysUntilExpiration = daysBetweenIsoDates(referenceDay, medicalExpiresAt);
      if (daysUntilExpiration < 0) {
        medicalStatus = "expired";
      } else if (daysUntilExpiration <= MEDICAL_EXPIRING_WINDOW_DAYS) {
        medicalStatus = "expiring_soon";
      } else {
        medicalStatus = "valid";
      }
    } else {
      medicalStatus = "missing";
    }
  }

  return {
    studentId: input.student.$id,
    profileId: input.student.profile_id,
    fullName: input.student.full_name,
    currentBelt: input.student.current_belt ?? null,
    gub: input.student.gub ?? null,
    trainingClassId: input.student.training_class_id ?? null,
    trainingClassName: input.trainingClassName?.trim() || input.student.training_class || "Sem turma vinculada",
    photoDocumentId: photo && photo.status !== "rejected" ? photo.$id : null,
    whatsapp: input.student.whatsapp ?? null,
    medicalStatus,
    medicalDocumentId: medCert?.$id ?? null,
    medicalIssuedAt,
    medicalExpiresAt,
    daysUntilExpiration,
    hasApprovedPhoto: photo?.status === "approved",
    hasEmergencyContact: Boolean(input.student.emergency_contact_phone?.trim()),
  };
}

export function sortComplianceAssessments(
  rows: StudentComplianceAssessment[]
): StudentComplianceAssessment[] {
  return [...rows].sort((a, b) => {
    const pDiff = STATUS_PRIORITY[a.medicalStatus] - STATUS_PRIORITY[b.medicalStatus];
    if (pDiff !== 0) return pDiff;
    const daysA = a.daysUntilExpiration ?? -9999;
    const daysB = b.daysUntilExpiration ?? -9999;
    if (daysA !== daysB) return daysA - daysB;
    return a.fullName.localeCompare(b.fullName, "pt-BR");
  });
}

export function summarizeCompliance(rows: StudentComplianceAssessment[]): ComplianceSummary {
  const totalActive = rows.length;
  const validCount = rows.filter((r) => r.medicalStatus === "valid").length;
  const expiringSoonCount = rows.filter((r) => r.medicalStatus === "expiring_soon").length;
  const expiredCount = rows.filter((r) => r.medicalStatus === "expired").length;
  const pendingReviewCount = rows.filter((r) => r.medicalStatus === "pending_review").length;
  const missingCount = rows.filter((r) => r.medicalStatus === "missing").length;
  const complianceRatePct =
    totalActive > 0
      ? Math.round(((validCount + expiringSoonCount) / totalActive) * 100)
      : 100;

  return {
    totalActive,
    validCount,
    expiringSoonCount,
    expiredCount,
    pendingReviewCount,
    missingCount,
    complianceRatePct,
    breakdown: [
      { key: "valid", label: "Em dia", count: validCount },
      { key: "expiring_soon", label: "Vence em 30d", count: expiringSoonCount },
      { key: "expired", label: "Vencido", count: expiredCount },
      { key: "pending_review", label: "Em análise", count: pendingReviewCount },
      { key: "missing", label: "Pendente / Recusado", count: missingCount },
    ],
  };
}
