import { studentSubmissionSchema } from "@/features/students/schemas";
import type { DocumentType, EnrollmentStatus, StudentDocument } from "@/features/students/types";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const transitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["awaiting_signature", "cancelled"],
  awaiting_signature: ["active", "cancelled"],
  active: ["paused", "cancelled", "awaiting_renewal"],
  paused: ["active", "cancelled"],
  cancelled: [],
  awaiting_renewal: ["active", "cancelled"]
};

export function canTransitionEnrollment(from: EnrollmentStatus, to: EnrollmentStatus) {
  return from === to || transitions[from].includes(to);
}

export function validateSubmission(input: unknown) {
  return studentSubmissionSchema.safeParse(input);
}

export function hasApprovedRequiredDocuments(documents: StudentDocument[]) {
  return (["profile_photo", "medical_certificate"] as DocumentType[]).every((type) =>
    documents.some((document) => document.document_type === type && document.status === "approved")
  );
}

export function detectFileKind(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "%PDF") return "application/pdf";
  return null;
}

export function validateDocumentFile(input: {
  name: string;
  declaredType: string;
  size: number;
  bytes: Uint8Array;
  documentType: DocumentType;
}) {
  if (input.size < 1 || input.size > MAX_DOCUMENT_BYTES) return { valid: false, error: "invalid_size" } as const;
  const detectedType = detectFileKind(input.bytes);
  if (!detectedType || detectedType !== input.declaredType) return { valid: false, error: "invalid_signature" } as const;
  const extension = input.name.toLowerCase().split(".").pop();
  const expected: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "application/pdf": ["pdf"]
  };
  if (!extension || !expected[detectedType]?.includes(extension)) return { valid: false, error: "invalid_extension" } as const;
  if (input.documentType === "profile_photo" && detectedType === "application/pdf") return { valid: false, error: "invalid_photo_type" } as const;
  return { valid: true, mimeType: detectedType } as const;
}
