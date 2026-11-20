import { describe, expect, it } from "vitest";
import {
  evaluateStudentCompliance,
  sortComplianceAssessments,
  summarizeCompliance,
} from "@/features/students/compliance-rules";
import type { Student, StudentDocument } from "@/features/students/types";

const baseStudent: Student = {
  $id: "s1",
  $sequence: "1",
  $createdAt: "2026-01-01T00:00:00Z",
  $updatedAt: "2026-01-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "students",
  profile_id: "p1",
  full_name: "Beatriz Lima",
  emergency_contact_phone: "(11) 99999-0000",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const makeDoc = (overrides: Partial<StudentDocument>): StudentDocument => ({
  $id: "d1",
  $sequence: "1",
  $createdAt: "2026-01-01T00:00:00Z",
  $updatedAt: "2026-01-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "docs",
  student_id: "s1",
  document_type: "medical_certificate",
  file_id: "f1",
  original_name: "atestado.pdf",
  mime_type: "application/pdf",
  size_bytes: 1024,
  status: "approved",
  uploaded_by_account_id: "u1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("compliance-rules", () => {
  it("classifica atestado válido (>30d), vencendo (<=30d) e vencido (>365d)", () => {
    const valid = evaluateStudentCompliance({
      student: baseStudent,
      documents: [makeDoc({ updated_at: "2026-06-01T12:00:00Z" })],
      referenceDate: "2026-11-18",
    });
    expect(valid.medicalStatus).toBe("valid");
    expect(valid.daysUntilExpiration).toBeGreaterThan(30);

    const expiring = evaluateStudentCompliance({
      student: baseStudent,
      documents: [makeDoc({ updated_at: "2025-12-05T12:00:00Z" })],
      referenceDate: "2026-11-18",
    });
    expect(expiring.medicalStatus).toBe("expiring_soon");
    expect(expiring.daysUntilExpiration).toBeGreaterThanOrEqual(0);
    expect(expiring.daysUntilExpiration).toBeLessThanOrEqual(30);

    const expired = evaluateStudentCompliance({
      student: baseStudent,
      documents: [makeDoc({ updated_at: "2025-10-01T12:00:00Z" })],
      referenceDate: "2026-11-18",
    });
    expect(expired.medicalStatus).toBe("expired");
    expect(expired.daysUntilExpiration).toBeLessThan(0);
  });

  it("identifica atestado em análise e ausente/rejeitado e ordena críticos primeiro", () => {
    const pending = evaluateStudentCompliance({
      student: { ...baseStudent, $id: "s2", full_name: "João" },
      documents: [makeDoc({ status: "pending" })],
      referenceDate: "2026-11-18",
    });
    expect(pending.medicalStatus).toBe("pending_review");

    const missing = evaluateStudentCompliance({
      student: { ...baseStudent, $id: "s3", full_name: "Maria", emergency_contact_phone: null },
      documents: [makeDoc({ status: "rejected" })],
      referenceDate: "2026-11-18",
    });
    expect(missing.medicalStatus).toBe("missing");
    expect(missing.hasEmergencyContact).toBe(false);

    const sorted = sortComplianceAssessments([pending, missing]);
    expect(sorted[0].studentId).toBe("s3");

    const summary = summarizeCompliance(sorted);
    expect(summary.totalActive).toBe(2);
    expect(summary.missingCount).toBe(1);
    expect(summary.pendingReviewCount).toBe(1);
    expect(summary.complianceRatePct).toBe(0);
  });
});

describe("situação combinada dos documentos anuais", () => {
  it("põe o aluno em todas as situações que pedem ação e em dia só quando nada falta", async () => {
    const { complianceBucketsOf, countComplianceBuckets } = await import("@/features/students/compliance-rules");
    expect(complianceBucketsOf({ medicalStatus: "expired", parqStatus: "missing" })).toEqual(["expired", "pending"]);
    expect(complianceBucketsOf({ medicalStatus: "valid", parqStatus: "expiring_soon" })).toEqual(["expiring_soon"]);
    expect(complianceBucketsOf({ medicalStatus: "pending_review", parqStatus: "valid" })).toEqual(["pending"]);
    expect(complianceBucketsOf({ medicalStatus: "valid", parqStatus: "valid" })).toEqual(["valid"]);
    expect(countComplianceBuckets([
      { medicalStatus: "expired", parqStatus: "expired" },
      { medicalStatus: "valid", parqStatus: "valid" },
    ])).toEqual({ expired: 1, expiring_soon: 0, pending: 0, valid: 1 });
  });
});
