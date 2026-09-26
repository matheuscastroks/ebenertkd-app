import { MAX_DOCUMENT_BYTES, canRoleViewStudentDocument, canTransitionEnrollment, detectFileKind, hasApprovedRequiredDocuments, hasRequiredSubmissionPhoto, validateDocumentFile, validateSubmission } from "@/features/students/rules";
import type { StudentDocument } from "@/features/students/types";
import { DUE_DAY_OPTIONS, GUB_OPTIONS, beltForGub, graduationMatches, gubForBelt } from "@/features/students/options";

describe("enrollment rules", () => {
  it("exposes only the allowed GUB and due-day choices", () => {
    expect(GUB_OPTIONS).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(DUE_DAY_OPTIONS).toEqual([5, 10, 15, 20, 25, 30]);
  });
  it("maps each GUB to exactly one CBTKD belt in both directions", () => {
    expect(beltForGub(9)).toBe("Cinza");
    expect(beltForGub(5)).toBe("Verde escura");
    expect(gubForBelt("Vermelha escura")).toBe(1);
    expect(graduationMatches(4, "Azul")).toBe(true);
    expect(graduationMatches(4, "Vermelha")).toBe(false);
  });
  it("allows the review path and rejects invalid jumps", () => {
    expect(canTransitionEnrollment("draft", "submitted")).toBe(true);
    expect(canTransitionEnrollment("under_review", "awaiting_signature")).toBe(true);
    expect(canTransitionEnrollment("draft", "active")).toBe(false);
  });

  it("requires a complete student record before submission", () => {
    expect(validateSubmission({ fullName: "Aluno Teste" }).success).toBe(false);
    expect(validateSubmission({
      fullName: "Aluno Teste", cpf: "529.982.247-25", birthDate: "2000-01-01", whatsapp: "11999999999",
      address: "Rua de Teste, 100", emergencyContactName: "Contato Teste", emergencyContactRelationship: "Familiar",
      emergencyContactPhone: "11988888888", startedAtTkd: "2025-01-01", currentBelt: "Cinza", gub: 9,
      healthCondition: "no", trainingClassId: "class-test", requestedDueDay: 10
    }).success).toBe(true);
    expect(validateSubmission({
      fullName: "Aluno Teste", cpf: "52998224725", birthDate: "2000-01-01", whatsapp: "11999999999",
      address: "Rua de Teste, 100", emergencyContactName: "Contato Teste", emergencyContactRelationship: "Familiar",
      emergencyContactPhone: "11988888888", startedAtTkd: "2025-01-01", currentBelt: "Cinza", gub: 10,
      healthCondition: "no", trainingClassId: "class-test", requestedDueDay: 12
    }).success).toBe(false);
    expect(validateSubmission({
      fullName: "Aluno Teste", cpf: "52998224725", birthDate: "2000-01-01", whatsapp: "11999999999",
      address: "Rua de Teste, 100", emergencyContactName: "Contato Teste", emergencyContactRelationship: "Familiar",
      emergencyContactPhone: "11988888888", startedAtTkd: "2025-01-01", currentBelt: "Azul", gub: 2,
      healthCondition: "no", trainingClassId: "class-test", requestedDueDay: 10
    }).success).toBe(false);
  });

  it("detects supported magic bytes", () => {
    expect(detectFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectFileKind(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
  });

  it("rejects a disguised executable and PDF profile photo", () => {
    expect(validateDocumentFile({ name: "foto.jpg", declaredType: "image/jpeg", size: 4, bytes: new Uint8Array([77, 90, 0, 0]), documentType: "profile_photo" }).valid).toBe(false);
    const pdf = new TextEncoder().encode("%PDF-1.7");
    expect(validateDocumentFile({ name: "foto.pdf", declaredType: "application/pdf", size: pdf.length, bytes: pdf, documentType: "profile_photo" }).valid).toBe(false);
  });

  it("rejects an excessive file and an extension that does not match its bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    expect(validateDocumentFile({ name: "foto.jpg", declaredType: "image/jpeg", size: MAX_DOCUMENT_BYTES + 1, bytes: jpeg, documentType: "profile_photo" }).valid).toBe(false);
    expect(validateDocumentFile({ name: "foto.png", declaredType: "image/jpeg", size: jpeg.length, bytes: jpeg, documentType: "profile_photo" }).valid).toBe(false);
  });

  it("requires approved medical certificate and valid photo before signature", () => {
    const document = (document_type: StudentDocument["document_type"], status: StudentDocument["status"]) => ({ document_type, status }) as StudentDocument;
    expect(hasApprovedRequiredDocuments([document("profile_photo", "pending"), document("medical_certificate", "pending")])).toBe(false);
    expect(hasApprovedRequiredDocuments([document("profile_photo", "rejected"), document("medical_certificate", "approved")])).toBe(false);
    expect(hasApprovedRequiredDocuments([document("profile_photo", "pending"), document("medical_certificate", "approved")])).toBe(true);
    expect(hasApprovedRequiredDocuments([document("profile_photo", "approved"), document("medical_certificate", "approved")])).toBe(true);
  });

  it("requires a current profile photo before submission", () => {
    const document = (document_type: StudentDocument["document_type"], status: StudentDocument["status"]) => ({ document_type, status }) as StudentDocument;
    expect(hasRequiredSubmissionPhoto([])).toBe(false);
    expect(hasRequiredSubmissionPhoto([document("profile_photo", "rejected")])).toBe(false);
    expect(hasRequiredSubmissionPhoto([document("profile_photo", "pending")])).toBe(true);
    expect(hasRequiredSubmissionPhoto([document("profile_photo", "approved")])).toBe(true);
  });

  it("allows minors to view only their profile photo document", () => {
    expect(canRoleViewStudentDocument("minor_student", "profile_photo")).toBe(true);
    expect(canRoleViewStudentDocument("minor_student", "medical_certificate")).toBe(false);
    expect(canRoleViewStudentDocument("admin", "medical_certificate")).toBe(true);
  });
});
