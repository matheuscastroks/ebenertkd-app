import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

export type ColumnDefinition =
  | { key: string; kind: "varchar"; size: number; required: boolean; array?: boolean }
  | { key: string; kind: "text"; required: boolean }
  | { key: string; kind: "datetime"; required: boolean }
  | { key: string; kind: "boolean"; required: boolean }
  | { key: string; kind: "integer"; required: boolean; min?: number; max?: number }
  | { key: string; kind: "float"; required: boolean; min?: number; max?: number }
  | { key: string; kind: "enum"; elements: string[]; required: boolean };

export type IndexDefinition = {
  key: string;
  type: "key" | "unique";
  columns: string[];
};

export type TableDefinition = {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
};

export const tables: TableDefinition[] = [
  {
    id: APPWRITE_IDS.tables.profiles,
    name: "Profiles",
    columns: [
      { key: "account_id", kind: "varchar", size: 36, required: true },
      { key: "full_name", kind: "varchar", size: 128, required: true },
      { key: "email", kind: "varchar", size: 320, required: true },
      { key: "username", kind: "varchar", size: 64, required: false },
      { key: "capabilities", kind: "varchar", size: 32, required: true, array: true },
      {
        key: "role",
        kind: "enum",
        elements: ["admin", "adult_student", "guardian", "minor_student"],
        required: true
      },
      {
        key: "status",
        kind: "enum",
        elements: ["active", "invited", "disabled"],
        required: true
      },
      { key: "onboarding_completed_at", kind: "datetime", required: false },
      { key: "onboarding_preferences", kind: "varchar", size: 2000, required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "account_id_unique", type: "unique", columns: ["account_id"] },
      { key: "role_idx", type: "key", columns: ["role"] },
      { key: "email_unique", type: "unique", columns: ["email"] },
      { key: "username_unique", type: "unique", columns: ["username"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.guardianStudentLinks,
    name: "Guardian student links",
    columns: [
      { key: "guardian_profile_id", kind: "varchar", size: 36, required: true },
      { key: "student_profile_id", kind: "varchar", size: 36, required: true },
      { key: "status", kind: "enum", elements: ["active", "revoked"], required: true },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "guardian_idx", type: "key", columns: ["guardian_profile_id"] },
      { key: "student_idx", type: "key", columns: ["student_profile_id"] },
      { key: "guardian_student_unique", type: "unique", columns: ["guardian_profile_id", "student_profile_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.trainingClasses,
    name: "Training classes",
    columns: [
      { key: "name", kind: "varchar", size: 96, required: true },
      { key: "weekdays", kind: "varchar", size: 16, required: true, array: true },
      { key: "start_time", kind: "varchar", size: 5, required: true },
      { key: "end_time", kind: "varchar", size: 5, required: true },
      { key: "location", kind: "varchar", size: 160, required: false },
      { key: "capacity", kind: "integer", required: false, min: 1, max: 500 },
      { key: "status", kind: "enum", elements: ["active", "inactive"], required: true },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "name_idx", type: "key", columns: ["name"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.classEnrollments,
    name: "Class enrollments",
    columns: [
      { key: "training_class_id", kind: "varchar", size: 36, required: true },
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "status", kind: "enum", elements: ["active", "ended"], required: true },
      { key: "started_at", kind: "datetime", required: true },
      { key: "ended_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "class_enrollment_unique", type: "unique", columns: ["training_class_id", "enrollment_id"] },
      { key: "class_status_idx", type: "key", columns: ["training_class_id", "status"] },
      { key: "student_idx", type: "key", columns: ["student_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.lessons,
    name: "Lessons",
    columns: [
      { key: "training_class_id", kind: "varchar", size: 36, required: true },
      { key: "lesson_date", kind: "datetime", required: true },
      { key: "start_time", kind: "varchar", size: 5, required: true },
      { key: "end_time", kind: "varchar", size: 5, required: true },
      { key: "lesson_type", kind: "enum", elements: ["regular", "makeup"], required: true },
      { key: "status", kind: "enum", elements: ["open", "completed", "cancelled"], required: true },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "class_date_time_unique", type: "unique", columns: ["training_class_id", "lesson_date", "start_time"] },
      { key: "date_status_idx", type: "key", columns: ["lesson_date", "status"] },
      { key: "class_idx", type: "key", columns: ["training_class_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.attendanceRecords,
    name: "Attendance records",
    columns: [
      { key: "lesson_id", kind: "varchar", size: 36, required: true },
      { key: "class_enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "status", kind: "enum", elements: ["present", "absent", "excused"], required: true },
      { key: "recorded_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "correction_reason", kind: "text", required: false },
      { key: "source", kind: "enum", elements: ["admin", "check_in", "justification", "auto"], required: false },
      { key: "justification", kind: "varchar", size: 280, required: false },
      { key: "check_in_distance_m", kind: "integer", required: false, min: 0, max: 100000 },
      { key: "checked_in_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "lesson_enrollment_unique", type: "unique", columns: ["lesson_id", "class_enrollment_id"] },
      { key: "lesson_idx", type: "key", columns: ["lesson_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.examParticipants,
    name: "Exam participants",
    columns: [
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "target_rank_key", kind: "varchar", size: 16, required: true },
      { key: "fee_cents", kind: "integer", required: true, min: 0 },
      { key: "charge_id", kind: "varchar", size: 36, required: false },
      { key: "status", kind: "enum", elements: ["registered", "approved", "failed", "absent", "cancelled"], required: true },
      { key: "result_notes", kind: "text", required: false },
      { key: "financial_decision", kind: "enum", elements: ["future_credit", "keep_charge"], required: false },
      { key: "graded_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "event_student_unique", type: "unique", columns: ["event_id", "student_id"] },
      { key: "event_status_idx", type: "key", columns: ["event_id", "status"] },
      { key: "student_idx", type: "key", columns: ["student_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.beltHistory,
    name: "Belt history",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "exam_participant_id", kind: "varchar", size: 36, required: true },
      { key: "previous_rank_key", kind: "varchar", size: 16, required: true },
      { key: "new_rank_key", kind: "varchar", size: 16, required: true },
      // Nome da faixa NA ÉPOCA: renomear uma graduação depois não reescreve o histórico (plano §2.5).
      { key: "previous_belt_name", kind: "varchar", size: 64, required: true },
      { key: "new_belt_name", kind: "varchar", size: 64, required: true },
      { key: "achieved_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "participant_unique", type: "unique", columns: ["exam_participant_id"] },
      { key: "student_achieved_idx", type: "key", columns: ["student_id", "achieved_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.students,
    name: "Students",
    columns: [
      { key: "profile_id", kind: "varchar", size: 36, required: true },
      { key: "full_name", kind: "varchar", size: 128, required: true },
      { key: "cpf", kind: "varchar", size: 11, required: false },
      { key: "birth_date", kind: "datetime", required: false },
      { key: "whatsapp", kind: "varchar", size: 24, required: false },
      { key: "address", kind: "text", required: false },
      { key: "emergency_contact_name", kind: "varchar", size: 128, required: false },
      { key: "emergency_contact_relationship", kind: "varchar", size: 64, required: false },
      { key: "emergency_contact_phone", kind: "varchar", size: 24, required: false },
      { key: "started_at_tkd", kind: "datetime", required: false },
      { key: "rank_key", kind: "varchar", size: 16, required: false },
      // Sexo para categorias de campeonato; opcional no banco, exigido no formulário de matrícula.
      { key: "sex", kind: "enum", elements: ["feminino", "masculino"], required: false },
      { key: "training_class_id", kind: "varchar", size: 36, required: false },
      { key: "training_class", kind: "varchar", size: 64, required: false },
      { key: "health_condition", kind: "enum", elements: ["yes", "no"], required: false },
      { key: "health_details", kind: "text", required: false },
      { key: "medications", kind: "text", required: false },
      { key: "allergies", kind: "text", required: false },
      { key: "injuries", kind: "text", required: false },
      { key: "guardian_contact", kind: "varchar", size: 160, required: false },
      { key: "status", kind: "enum", elements: ["draft", "submitted", "active", "inactive"], required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "profile_id_unique", type: "unique", columns: ["profile_id"] },
      { key: "cpf_unique", type: "unique", columns: ["cpf"] },
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "name_idx", type: "key", columns: ["full_name"] },
      { key: "class_id_idx", type: "key", columns: ["training_class_id"] },
      { key: "class_idx", type: "key", columns: ["training_class"] },
      { key: "rank_key_idx", type: "key", columns: ["rank_key"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.enrollments,
    name: "Enrollments",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "status", kind: "enum", elements: ["draft", "submitted", "under_review", "awaiting_signature", "active", "paused", "cancelled", "awaiting_renewal"], required: true },
      { key: "requested_due_day", kind: "integer", required: false, min: 5, max: 30 },
      { key: "approved_due_day", kind: "integer", required: false, min: 5, max: 30 },
      { key: "monthly_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "discount_cents", kind: "integer", required: false, min: 0 },
      { key: "first_due_date", kind: "datetime", required: false },
      { key: "contract_start", kind: "datetime", required: false },
      { key: "contract_end", kind: "datetime", required: false },
      { key: "access_override_until", kind: "datetime", required: false },
      { key: "revision", kind: "integer", required: true, min: 1 },
      { key: "submitted_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "student_id_unique", type: "unique", columns: ["student_id"] },
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "updated_at_idx", type: "key", columns: ["updated_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.studentDocuments,
    name: "Student documents",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "document_type", kind: "enum", elements: ["profile_photo", "medical_certificate"], required: true },
      { key: "file_id", kind: "varchar", size: 36, required: true },
      { key: "original_name", kind: "varchar", size: 255, required: true },
      { key: "mime_type", kind: "varchar", size: 96, required: true },
      { key: "size_bytes", kind: "integer", required: true, min: 1, max: 5242880 },
      { key: "status", kind: "enum", elements: ["pending", "approved", "rejected"], required: true },
      { key: "rejection_reason", kind: "text", required: false },
      { key: "uploaded_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "student_type_unique", type: "unique", columns: ["student_id", "document_type"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "status_idx", type: "key", columns: ["status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.parqSubmissions,
    name: "PAR-Q submissions",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "signer_profile_id", kind: "varchar", size: 36, required: true },
      { key: "signer_account_id", kind: "varchar", size: 36, required: true },
      { key: "signer_name", kind: "varchar", size: 128, required: true },
      { key: "signer_role", kind: "enum", elements: ["adult_student", "guardian", "admin"], required: true },
      { key: "answers_json", kind: "text", required: true },
      { key: "has_yes_answer", kind: "boolean", required: true },
      { key: "requires_medical_certificate", kind: "boolean", required: true },
      { key: "term_accepted", kind: "boolean", required: true },
      { key: "signature_data_url", kind: "text", required: true },
      { key: "content_hash", kind: "varchar", size: 64, required: true },
      { key: "ip_fingerprint", kind: "varchar", size: 64, required: false },
      { key: "signed_at", kind: "datetime", required: true },
      { key: "expires_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "student_signed_idx", type: "key", columns: ["student_id", "signed_at"] },
      { key: "expires_at_idx", type: "key", columns: ["expires_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.enrollmentReviews,
    name: "Enrollment reviews",
    columns: [
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "actor_account_id", kind: "varchar", size: 36, required: true },
      { key: "action", kind: "varchar", size: 64, required: true },
      { key: "notes", kind: "text", required: false },
      { key: "snapshot", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "enrollment_idx", type: "key", columns: ["enrollment_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "created_at_idx", type: "key", columns: ["created_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.contractTemplates,
    name: "Contract templates",
    columns: [
      { key: "name", kind: "varchar", size: 128, required: true },
      { key: "draft_content", kind: "text", required: true },
      { key: "published_version_id", kind: "varchar", size: 36, required: false },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "name_idx", type: "key", columns: ["name"] }]
  },
  {
    id: APPWRITE_IDS.tables.contractVersions,
    name: "Contract versions",
    columns: [
      { key: "template_id", kind: "varchar", size: 36, required: true },
      { key: "version", kind: "integer", required: true, min: 1 },
      { key: "content", kind: "text", required: true },
      { key: "content_hash", kind: "varchar", size: 64, required: true },
      { key: "published_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "published_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "template_idx", type: "key", columns: ["template_id"] },
      { key: "template_version_unique", type: "unique", columns: ["template_id", "version"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.contracts,
    name: "Contracts",
    columns: [
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "version_id", kind: "varchar", size: 36, required: true },
      { key: "version_number", kind: "integer", required: true, min: 1 },
      { key: "status", kind: "enum", elements: ["pending_signature", "signed", "expired", "cancelled"], required: true },
      { key: "content_snapshot", kind: "text", required: true },
      { key: "content_hash", kind: "varchar", size: 64, required: true },
      { key: "policy_snapshot_json", kind: "text", required: true },
      { key: "academy_legal_name", kind: "varchar", size: 160, required: true },
      { key: "academy_document", kind: "varchar", size: 32, required: false },
      { key: "student_name", kind: "varchar", size: 128, required: true },
      { key: "guardian_name", kind: "varchar", size: 128, required: false },
      { key: "monthly_fee_cents", kind: "integer", required: true, min: 0 },
      { key: "starts_at", kind: "datetime", required: true },
      { key: "ends_at", kind: "datetime", required: true },
      { key: "signature_id", kind: "varchar", size: 36, required: false },
      { key: "pdf_file_id", kind: "varchar", size: 36, required: false },
      { key: "pdf_hash", kind: "varchar", size: 64, required: false },
      { key: "signed_at", kind: "datetime", required: false },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "enrollment_idx", type: "key", columns: ["enrollment_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "ends_at_idx", type: "key", columns: ["ends_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.contractSignatures,
    name: "Contract signatures",
    columns: [
      { key: "contract_id", kind: "varchar", size: 36, required: true },
      { key: "signer_profile_id", kind: "varchar", size: 36, required: true },
      { key: "signer_account_id", kind: "varchar", size: 36, required: true },
      { key: "signer_name", kind: "varchar", size: 128, required: true },
      { key: "signature_data_url", kind: "text", required: true },
      { key: "content_hash", kind: "varchar", size: 64, required: true },
      { key: "ip_fingerprint", kind: "varchar", size: 64, required: false },
      { key: "user_agent", kind: "varchar", size: 512, required: false },
      { key: "accepted_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "contract_unique", type: "unique", columns: ["contract_id"] },
      { key: "signer_idx", type: "key", columns: ["signer_profile_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.cancellationRequests,
    name: "Cancellation requests",
    columns: [
      { key: "contract_id", kind: "varchar", size: 36, required: true },
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "requested_by_profile_id", kind: "varchar", size: 36, required: true },
      { key: "target_exit_month", kind: "datetime", required: true },
      { key: "notice_date", kind: "datetime", required: true },
      { key: "suggested_fee_cents", kind: "integer", required: true, min: 0 },
      { key: "decided_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "status", kind: "enum", elements: ["pending", "approved", "rejected"], required: true },
      { key: "reason", kind: "text", required: false },
      { key: "decision_notes", kind: "text", required: false },
      { key: "decided_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "decided_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "contract_idx", type: "key", columns: ["contract_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "status_idx", type: "key", columns: ["status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.charges,
    name: "Charges",
    columns: [
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "contract_id", kind: "varchar", size: 36, required: false },
      { key: "charge_type", kind: "enum", elements: ["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee", "event_fee"], required: true },
      { key: "competence", kind: "varchar", size: 7, required: true },
      { key: "origin_id", kind: "varchar", size: 36, required: true },
      { key: "amount_cents", kind: "integer", required: true, min: 0 },
      { key: "due_date", kind: "datetime", required: true },
      { key: "status", kind: "enum", elements: ["pending", "proof_under_review", "paid", "overdue", "cancelled"], required: true },
      { key: "description", kind: "varchar", size: 255, required: true },
      { key: "adjustment_reason", kind: "text", required: false },
      { key: "cancelled_at", kind: "datetime", required: false },
      { key: "cancellation_reason", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "charge_origin_unique", type: "unique", columns: ["enrollment_id", "charge_type", "competence", "origin_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "competence_idx", type: "key", columns: ["competence"] },
      { key: "due_date_idx", type: "key", columns: ["due_date"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.paymentProofs,
    name: "Payment proofs",
    columns: [
      { key: "charge_id", kind: "varchar", size: 36, required: true },
      { key: "file_id", kind: "varchar", size: 36, required: true },
      { key: "original_name", kind: "varchar", size: 255, required: true },
      { key: "mime_type", kind: "varchar", size: 96, required: true },
      { key: "size_bytes", kind: "integer", required: true, min: 1, max: 5242880 },
      { key: "version", kind: "integer", required: true, min: 1 },
      { key: "status", kind: "enum", elements: ["pending", "approved", "rejected", "superseded"], required: true },
      { key: "rejection_reason", kind: "text", required: false },
      { key: "uploaded_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "reviewed_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "reviewed_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "charge_idx", type: "key", columns: ["charge_id"] },
      { key: "charge_version_unique", type: "unique", columns: ["charge_id", "version"] },
      { key: "status_idx", type: "key", columns: ["status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.payments,
    name: "Payments",
    columns: [
      { key: "charge_id", kind: "varchar", size: 36, required: true },
      { key: "proof_id", kind: "varchar", size: 36, required: false },
      { key: "method", kind: "enum", elements: ["pix_proof", "manual"], required: true },
      { key: "amount_cents", kind: "integer", required: true, min: 0 },
      { key: "paid_at", kind: "datetime", required: true },
      { key: "status", kind: "enum", elements: ["confirmed", "reversed"], required: true },
      { key: "recorded_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "notes", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "charge_idx", type: "key", columns: ["charge_id"] },
      { key: "proof_unique", type: "unique", columns: ["proof_id"] },
      { key: "paid_at_idx", type: "key", columns: ["paid_at"] },
      { key: "status_idx", type: "key", columns: ["status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.paymentReversals,
    name: "Payment reversals",
    columns: [
      { key: "payment_id", kind: "varchar", size: 36, required: true },
      { key: "charge_id", kind: "varchar", size: 36, required: true },
      { key: "reason", kind: "text", required: true },
      { key: "reversed_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "reversed_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "payment_unique", type: "unique", columns: ["payment_id"] },
      { key: "charge_idx", type: "key", columns: ["charge_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.billingSettings,
    name: "Billing settings",
    columns: [
      { key: "pix_key", kind: "varchar", size: 320, required: true },
      { key: "pix_key_type", kind: "enum", elements: ["cpf", "cnpj", "email", "phone", "random"], required: true },
      { key: "beneficiary_name", kind: "varchar", size: 160, required: true },
      { key: "instructions", kind: "text", required: false },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: []
  },
  {
    id: APPWRITE_IDS.tables.financeScenarios,
    name: "Finance scenarios",
    columns: [
      { key: "name", kind: "varchar", size: 64, required: true },
      { key: "fixed_costs_json", kind: "text", required: true },
      { key: "variable_cost_cents", kind: "integer", required: true, min: 0 },
      { key: "payment_fee_bps", kind: "integer", required: true, min: 0, max: 10000 },
      { key: "pro_labore_cents", kind: "integer", required: true, min: 0 },
      { key: "reserve_cents", kind: "integer", required: true, min: 0 },
      { key: "default_rate_bps", kind: "integer", required: true, min: 0, max: 10000 },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "updated_at_idx", type: "key", columns: ["updated_at"] }]
  },
  {
    id: APPWRITE_IDS.tables.tuitionAdjustments,
    name: "Tuition adjustments",
    columns: [
      { key: "status", kind: "enum", elements: ["draft", "applied", "cancelled"], required: true },
      { key: "mode", kind: "enum", elements: ["percent", "fixed", "rounded"], required: true },
      { key: "percent_bps", kind: "integer", required: false, min: 0, max: 100000 },
      { key: "reference_index_label", kind: "varchar", size: 128, required: false },
      { key: "effective_from", kind: "datetime", required: true },
      { key: "message_template", kind: "text", required: true },
      { key: "total_monthly_impact_cents", kind: "integer", required: true },
      { key: "item_count", kind: "integer", required: true, min: 0 },
      { key: "applied_at", kind: "datetime", required: false },
      { key: "applied_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "notice_published_at", kind: "datetime", required: false },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "created_at_idx", type: "key", columns: ["created_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.tuitionAdjustmentItems,
    name: "Tuition adjustment items",
    columns: [
      { key: "adjustment_id", kind: "varchar", size: 36, required: true },
      { key: "enrollment_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "previous_fee_cents", kind: "integer", required: true, min: 0 },
      { key: "new_fee_cents", kind: "integer", required: true, min: 0 },
      { key: "excluded", kind: "boolean", required: true },
      { key: "applied_at", kind: "datetime", required: false },
      { key: "notified_at", kind: "datetime", required: false }
    ],
    indexes: [
      { key: "adjustment_idx", type: "key", columns: ["adjustment_id"] },
      { key: "enrollment_idx", type: "key", columns: ["enrollment_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "adjustment_enrollment_unique", type: "unique", columns: ["adjustment_id", "enrollment_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.notifications,
    name: "Notifications",
    columns: [
      { key: "kind", kind: "enum", elements: ["announcement", "payment_reminder", "system"], required: true },
      { key: "title", kind: "varchar", size: 128, required: true },
      { key: "body", kind: "text", required: true },
      { key: "audience", kind: "enum", elements: ["all", "class", "profile", "system"], required: true },
      { key: "audience_id", kind: "varchar", size: 36, required: false },
      { key: "action_url", kind: "varchar", size: 512, required: false },
      { key: "dedupe_key", kind: "varchar", size: 160, required: true },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "published_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "dedupe_key_unique", type: "unique", columns: ["dedupe_key"] },
      { key: "published_at_idx", type: "key", columns: ["published_at"] },
      { key: "audience_idx", type: "key", columns: ["audience", "audience_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.notificationRecipients,
    name: "Notification recipients",
    columns: [
      { key: "notification_id", kind: "varchar", size: 36, required: true },
      { key: "profile_id", kind: "varchar", size: 36, required: true },
      { key: "account_id", kind: "varchar", size: 36, required: true },
      { key: "read_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "notification_profile_unique", type: "unique", columns: ["notification_id", "profile_id"] },
      { key: "profile_created_idx", type: "key", columns: ["profile_id", "created_at"] },
      { key: "notification_idx", type: "key", columns: ["notification_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.notificationPreferences,
    name: "Notification preferences",
    columns: [
      { key: "account_id", kind: "varchar", size: 36, required: true },
      { key: "announcements_enabled", kind: "boolean", required: true },
      { key: "financial_enabled", kind: "boolean", required: true },
      { key: "system_enabled", kind: "boolean", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "account_id_unique", type: "unique", columns: ["account_id"] }]
  },
  {
    id: APPWRITE_IDS.tables.pushSubscriptions,
    name: "Push subscriptions",
    columns: [
      { key: "profile_id", kind: "varchar", size: 36, required: true },
      { key: "account_id", kind: "varchar", size: 36, required: true },
      { key: "endpoint_hash", kind: "varchar", size: 64, required: true },
      { key: "subscription_ciphertext", kind: "text", required: true },
      { key: "user_agent", kind: "varchar", size: 512, required: false },
      { key: "status", kind: "enum", elements: ["active", "expired", "revoked"], required: true },
      { key: "last_seen_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "endpoint_hash_unique", type: "unique", columns: ["endpoint_hash"] },
      { key: "profile_status_idx", type: "key", columns: ["profile_id", "status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.notificationDeliveries,
    name: "Notification deliveries",
    columns: [
      { key: "notification_id", kind: "varchar", size: 36, required: true },
      { key: "recipient_id", kind: "varchar", size: 36, required: true },
      { key: "subscription_id", kind: "varchar", size: 36, required: true },
      { key: "channel", kind: "enum", elements: ["push"], required: true },
      { key: "status", kind: "enum", elements: ["pending", "sent", "failed", "expired", "skipped"], required: true },
      { key: "attempts", kind: "integer", required: true, min: 0, max: 100 },
      { key: "last_error", kind: "text", required: false },
      { key: "delivered_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "recipient_subscription_unique", type: "unique", columns: ["recipient_id", "subscription_id"] },
      { key: "notification_status_idx", type: "key", columns: ["notification_id", "status"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.auditEvents,
    name: "Audit events",
    columns: [
      { key: "actor_account_id", kind: "varchar", size: 36, required: false },
      { key: "event_type", kind: "varchar", size: 64, required: true },
      { key: "entity_type", kind: "varchar", size: 64, required: false },
      { key: "entity_id", kind: "varchar", size: 36, required: false },
      { key: "metadata", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "event_type_idx", type: "key", columns: ["event_type"] },
      { key: "created_at_idx", type: "key", columns: ["created_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.automationRuns,
    name: "Automation runs",
    columns: [
      { key: "job", kind: "varchar", size: 64, required: true },
      { key: "idempotency_key", kind: "varchar", size: 128, required: true },
      {
        key: "status",
        kind: "enum",
        elements: ["started", "completed", "failed"],
        required: true
      },
      { key: "started_at", kind: "datetime", required: true },
      { key: "finished_at", kind: "datetime", required: false },
      { key: "details", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "idempotency_key_unique", type: "unique", columns: ["idempotency_key"] },
      { key: "job_idx", type: "key", columns: ["job"] },
      { key: "created_at_idx", type: "key", columns: ["created_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.academySettings,
    name: "Academy settings",
    columns: [
      { key: "legal_name", kind: "varchar", size: 160, required: true },
      { key: "display_name", kind: "varchar", size: 96, required: true },
      { key: "short_name", kind: "varchar", size: 24, required: true },
      { key: "document_type", kind: "enum", elements: ["cnpj", "cpf"], required: false },
      { key: "document_number", kind: "varchar", size: 14, required: false },
      { key: "address_line", kind: "varchar", size: 160, required: false },
      { key: "address_complement", kind: "varchar", size: 96, required: false },
      { key: "address_district", kind: "varchar", size: 96, required: false },
      { key: "address_city", kind: "varchar", size: 96, required: false },
      { key: "address_state", kind: "varchar", size: 2, required: false },
      { key: "address_zip", kind: "varchar", size: 8, required: false },
      { key: "phone_whatsapp", kind: "varchar", size: 24, required: false },
      { key: "contact_email", kind: "varchar", size: 320, required: false },
      { key: "instagram_handle", kind: "varchar", size: 64, required: false },
      { key: "professor_name", kind: "varchar", size: 128, required: false },
      { key: "professor_title", kind: "varchar", size: 32, required: false },
      { key: "professor_graduation", kind: "varchar", size: 64, required: false },
      { key: "privacy_contact", kind: "varchar", size: 320, required: false },
      { key: "dpo_name", kind: "varchar", size: 128, required: false },
      { key: "logo_file_id", kind: "varchar", size: 36, required: false },
      { key: "theme_color", kind: "varchar", size: 7, required: false },
      { key: "federation", kind: "enum", elements: ["cbtkd", "itf", "kukkiwon", "custom"], required: false },
      { key: "timezone", kind: "varchar", size: 64, required: false },
      { key: "setup_completed_at", kind: "datetime", required: false },
      { key: "revision", kind: "integer", required: true, min: 1 },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: []
  },
  {
    id: APPWRITE_IDS.tables.academyPolicies,
    name: "Academy policies",
    columns: [
      { key: "section", kind: "varchar", size: 32, required: true },
      { key: "schema_version", kind: "integer", required: true, min: 1 },
      { key: "data_json", kind: "text", required: true },
      { key: "revision", kind: "integer", required: true, min: 1 },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "section_unique", type: "unique", columns: ["section"] }]
  },
  {
    id: APPWRITE_IDS.tables.academyConfigRevisions,
    name: "Academy config revisions",
    columns: [
      { key: "scope", kind: "enum", elements: ["settings", "policy", "belt_ranks"], required: true },
      { key: "section", kind: "varchar", size: 32, required: true },
      { key: "entity_id", kind: "varchar", size: 36, required: true },
      { key: "revision", kind: "integer", required: true, min: 1 },
      { key: "before_json", kind: "text", required: false },
      { key: "after_json", kind: "text", required: true },
      { key: "reason", kind: "varchar", size: 500, required: false },
      { key: "changed_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "changed_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "scope_section_revision_unique", type: "unique", columns: ["scope", "section", "revision"] },
      { key: "changed_at_idx", type: "key", columns: ["changed_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.beltRankSettings,
    name: "Belt rank settings",
    columns: [
      { key: "rank_key", kind: "varchar", size: 16, required: true },
      { key: "display_name", kind: "varchar", size: 64, required: true },
      { key: "aliases", kind: "varchar", size: 64, required: false, array: true },
      { key: "color_primary", kind: "varchar", size: 7, required: true },
      { key: "color_secondary", kind: "varchar", size: 7, required: true },
      { key: "color_style", kind: "enum", elements: ["solid", "tip", "stripe", "half"], required: true },
      { key: "form_name", kind: "varchar", size: 96, required: false },
      { key: "min_days", kind: "integer", required: false, min: 0 },
      { key: "min_presences", kind: "integer", required: false, min: 0 },
      { key: "min_age_years", kind: "integer", required: false, min: 0 },
      { key: "exam_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "enabled", kind: "boolean", required: true },
      { key: "revision", kind: "integer", required: true, min: 1 },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "rank_key_unique", type: "unique", columns: ["rank_key"] }]
  },
  {
    id: APPWRITE_IDS.tables.trainingLocations,
    name: "Training locations",
    columns: [
      { key: "name", kind: "varchar", size: 96, required: true },
      { key: "address", kind: "varchar", size: 200, required: false },
      { key: "complement", kind: "varchar", size: 200, required: false },
      { key: "notes", kind: "varchar", size: 500, required: false },
      { key: "latitude", kind: "float", required: false, min: -90, max: 90 },
      { key: "longitude", kind: "float", required: false, min: -180, max: 180 },
      { key: "check_in_radius_m", kind: "integer", required: false, min: 25, max: 2000 },
      { key: "is_default", kind: "boolean", required: true },
      { key: "status", kind: "enum", elements: ["active", "archived"], required: true },
      { key: "updated_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "status_idx", type: "key", columns: ["status"] }]
  },
  {
    id: APPWRITE_IDS.tables.events,
    name: "Events",
    columns: [
      { key: "event_type", kind: "enum", elements: ["belt_exam", "championship", "seminar", "social", "other"], required: true },
      { key: "title", kind: "varchar", size: 128, required: true },
      { key: "description", kind: "text", required: false },
      { key: "status", kind: "enum", elements: ["draft", "published", "registration_open", "registration_closed", "in_progress", "completed", "cancelled"], required: true },
      { key: "starts_at", kind: "datetime", required: true },
      { key: "ends_at", kind: "datetime", required: false },
      { key: "location_id", kind: "varchar", size: 36, required: false },
      { key: "location_text", kind: "varchar", size: 160, required: false },
      { key: "organizer_type", kind: "enum", elements: ["academy", "external"], required: true },
      { key: "organizer_name", kind: "varchar", size: 128, required: false },
      { key: "registration_opens_at", kind: "datetime", required: false },
      { key: "registration_closes_at", kind: "datetime", required: false },
      { key: "audience", kind: "enum", elements: ["students", "students_and_guests", "public"], required: true },
      { key: "requires_approval", kind: "boolean", required: true },
      { key: "capacity", kind: "integer", required: false, min: 1 },
      { key: "max_companions", kind: "integer", required: false, min: 0 },
      { key: "companion_price_cents", kind: "integer", required: false, min: 0 },
      // Idade das classes de campeonato: ano de nascimento (padrão WT) ou data exata do evento.
      { key: "age_cutoff", kind: "enum", elements: ["birth_year", "event_date"], required: true },
      // Exame de faixa: taxa padrão da banca (a taxa da graduação alvo, quando configurada, tem prioridade).
      { key: "exam_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "cover_file_id", kind: "varchar", size: 36, required: false },
      { key: "external_url", kind: "varchar", size: 512, required: false },
      { key: "cancelled_at", kind: "datetime", required: false },
      { key: "cancellation_reason", kind: "varchar", size: 255, required: false },
      { key: "created_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "starts_at_idx", type: "key", columns: ["starts_at"] },
      { key: "status_idx", type: "key", columns: ["status"] },
      { key: "type_idx", type: "key", columns: ["event_type"] },
      { key: "type_starts_idx", type: "key", columns: ["event_type", "starts_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.eventDeadlines,
    name: "Event deadlines",
    columns: [
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "kind", kind: "enum", elements: ["affiliation", "registration", "category_change", "weigh_in", "payment", "custom"], required: true },
      { key: "label", kind: "varchar", size: 128, required: true },
      { key: "due_at", kind: "datetime", required: true },
      { key: "notify_days_before", kind: "integer", required: false, min: 0, max: 60 },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "event_idx", type: "key", columns: ["event_id"] },
      { key: "due_at_idx", type: "key", columns: ["due_at"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.eventOptions,
    name: "Event options",
    columns: [
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "label", kind: "varchar", size: 128, required: true },
      { key: "modality", kind: "enum", elements: ["kyorugi", "poomsae", "festival", "team", "general"], required: true },
      { key: "price_cents", kind: "integer", required: true, min: 0 },
      // Taxa da federação (campeonato), cobrada separadamente dos custos da academia (`price_cents`).
      { key: "federation_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "capacity", kind: "integer", required: false, min: 1 },
      { key: "eligibility_json", kind: "text", required: false },
      { key: "max_per_registrant_group", kind: "varchar", size: 32, required: false },
      { key: "sort_order", kind: "integer", required: true, min: 0 },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "event_idx", type: "key", columns: ["event_id", "sort_order"] }]
  },
  {
    id: APPWRITE_IDS.tables.eventRegistrations,
    name: "Event registrations",
    columns: [
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "option_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: false },
      { key: "enrollment_id", kind: "varchar", size: 36, required: false },
      // Convidado sem conta: só o mínimo (LGPD); apagado após o evento.
      { key: "guest_name", kind: "varchar", size: 128, required: false },
      { key: "guest_contact", kind: "varchar", size: 24, required: false },
      { key: "registered_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "status", kind: "enum", elements: ["interested", "pending_approval", "confirmed", "waitlisted", "checked_in", "completed", "no_show", "rejected", "cancelled"], required: true },
      { key: "waitlist_position", kind: "integer", required: false, min: 1 },
      { key: "companions", kind: "integer", required: true, min: 0 },
      { key: "declared_weight_grams", kind: "integer", required: false, min: 0 },
      { key: "rank_key_snapshot", kind: "varchar", size: 16, required: false },
      { key: "age_class_snapshot", kind: "varchar", size: 32, required: false },
      { key: "price_cents", kind: "integer", required: true, min: 0 },
      { key: "federation_price_cents", kind: "integer", required: false, min: 0 },
      { key: "charge_id", kind: "varchar", size: 36, required: false },
      { key: "federation_charge_id", kind: "varchar", size: 36, required: false },
      { key: "financial_decision", kind: "enum", elements: ["future_credit", "keep_charge"], required: false },
      { key: "terms_accepted_at", kind: "datetime", required: false },
      { key: "guardian_authorized_at", kind: "datetime", required: false },
      { key: "guardian_account_id", kind: "varchar", size: 36, required: false },
      { key: "external_submitted_at", kind: "datetime", required: false },
      { key: "checked_in_at", kind: "datetime", required: false },
      { key: "cancelled_at", kind: "datetime", required: false },
      { key: "notes", kind: "text", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "event_status_idx", type: "key", columns: ["event_id", "status"] },
      { key: "student_idx", type: "key", columns: ["student_id"] },
      { key: "event_option_student_unique", type: "unique", columns: ["event_id", "option_id", "student_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.eventRegistrationDocuments,
    name: "Event registration documents",
    columns: [
      { key: "registration_id", kind: "varchar", size: 36, required: true },
      { key: "kind", kind: "enum", elements: ["guardian_authorization", "responsibility_term", "medical", "federation_card", "other"], required: true },
      { key: "file_id", kind: "varchar", size: 36, required: true },
      { key: "original_name", kind: "varchar", size: 255, required: false },
      { key: "mime_type", kind: "varchar", size: 64, required: false },
      { key: "status", kind: "enum", elements: ["pending", "approved", "rejected"], required: true },
      { key: "rejection_reason", kind: "varchar", size: 255, required: false },
      { key: "uploaded_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "reviewed_by_account_id", kind: "varchar", size: 36, required: false },
      { key: "reviewed_at", kind: "datetime", required: false },
      { key: "created_at", kind: "datetime", required: true },
      { key: "updated_at", kind: "datetime", required: true }
    ],
    indexes: [{ key: "registration_idx", type: "key", columns: ["registration_id"] }]
  },
  {
    id: APPWRITE_IDS.tables.eventResults,
    name: "Event results",
    columns: [
      { key: "registration_id", kind: "varchar", size: 36, required: true },
      { key: "event_id", kind: "varchar", size: 36, required: true },
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "placement", kind: "integer", required: false, min: 1 },
      { key: "medal", kind: "enum", elements: ["gold", "silver", "bronze", "none"], required: true },
      { key: "notes", kind: "text", required: false },
      { key: "recorded_by_account_id", kind: "varchar", size: 36, required: true },
      { key: "recorded_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "registration_unique", type: "unique", columns: ["registration_id"] },
      { key: "event_idx", type: "key", columns: ["event_id"] },
      { key: "student_idx", type: "key", columns: ["student_id"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.studentBadges,
    name: "Student badges",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "kind", kind: "enum", elements: ["participation", "medal_gold", "medal_silver", "medal_bronze", "exam_approved", "seminar_attendance"], required: true },
      { key: "source", kind: "enum", elements: ["event_result", "event_attendance", "exam_result"], required: true },
      { key: "source_id", kind: "varchar", size: 36, required: true },
      // `source:source_id:kind`: garante uma única conquista por origem (idempotente).
      { key: "source_key", kind: "varchar", size: 96, required: true },
      { key: "event_id", kind: "varchar", size: 36, required: false },
      { key: "title", kind: "varchar", size: 128, required: true },
      { key: "description", kind: "varchar", size: 255, required: false },
      { key: "awarded_at", kind: "datetime", required: true },
      { key: "created_at", kind: "datetime", required: true }
    ],
    indexes: [
      { key: "source_key_unique", type: "unique", columns: ["source_key"] },
      { key: "student_awarded_idx", type: "key", columns: ["student_id", "awarded_at"] }
    ]
  }
];

export const bucket = {
  id: APPWRITE_IDS.bucket,
  name: "Private files",
  maximumFileSize: 5 * 1024 * 1024,
  extensions: ["jpg", "jpeg", "png", "webp", "pdf"]
} as const;

export const functions = [
  {
    id: APPWRITE_IDS.functions.dailyOperations,
    name: "Daily operations",
    schedule: "",
    interval: 1440,
    root: "appwrite/functions/daily-operations"
  },
  {
    id: APPWRITE_IDS.functions.backup,
    name: "Backup",
    schedule: "45 3 * * *",
    root: "appwrite/functions/backup"
  }
] as const;
