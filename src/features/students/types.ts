import type { Models } from "node-appwrite";

export type EnrollmentStatus = "draft" | "submitted" | "under_review" | "awaiting_signature" | "active" | "paused" | "cancelled" | "awaiting_renewal";
export type DocumentType = "profile_photo" | "medical_certificate";
export type DocumentStatus = "pending" | "approved" | "rejected";

export type Student = Models.Row & {
  profile_id: string;
  full_name: string;
  cpf?: string | null;
  birth_date?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  started_at_tkd?: string | null;
  /** Graduação (`rank_key`, p. ex. "gub-9"). Nome e cor da faixa vêm sempre da configuração. */
  rank_key?: string | null;
  /** Sexo para categorias de campeonato (opcional no banco; o formulário de matrícula exige). */
  sex?: "feminino" | "masculino" | null;
  training_class_id?: string | null;
  training_class?: string | null;
  health_condition?: "yes" | "no" | null;
  health_details?: string | null;
  medications?: string | null;
  allergies?: string | null;
  injuries?: string | null;
  guardian_contact?: string | null;
  status: "draft" | "submitted" | "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type Enrollment = Models.Row & {
  student_id: string;
  status: EnrollmentStatus;
  requested_due_day?: number | null;
  approved_due_day?: number | null;
  monthly_fee_cents?: number | null;
  discount_cents?: number | null;
  first_due_date?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  access_override_until?: string | null;
  revision: number;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentDocument = Models.Row & {
  student_id: string;
  document_type: DocumentType;
  file_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  rejection_reason?: string | null;
  uploaded_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type ParqSubmission = Models.Row & {
  student_id: string;
  signer_profile_id: string;
  signer_account_id: string;
  signer_name: string;
  signer_role: "adult_student" | "guardian" | "admin";
  answers_json: string;
  has_yes_answer: boolean;
  requires_medical_certificate: boolean;
  term_accepted: boolean;
  signature_data_url: string;
  content_hash: string;
  ip_fingerprint?: string | null;
  signed_at: string;
  expires_at: string;
  created_at: string;
};

export type EnrollmentBundle = {
  student: Student;
  enrollment: Enrollment;
  documents: StudentDocument[];
};
