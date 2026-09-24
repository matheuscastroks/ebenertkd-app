import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

export type ColumnDefinition =
  | { key: string; kind: "varchar"; size: number; required: boolean; array?: boolean }
  | { key: string; kind: "text"; required: boolean }
  | { key: string; kind: "datetime"; required: boolean }
  | { key: string; kind: "integer"; required: boolean; min?: number; max?: number }
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
      { key: "current_belt", kind: "varchar", size: 64, required: false },
      { key: "training_class", kind: "varchar", size: 64, required: false },
      { key: "gub", kind: "integer", required: false, min: 1, max: 10 },
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
      { key: "class_idx", type: "key", columns: ["training_class"] }
    ]
  },
  {
    id: APPWRITE_IDS.tables.enrollments,
    name: "Enrollments",
    columns: [
      { key: "student_id", kind: "varchar", size: 36, required: true },
      { key: "status", kind: "enum", elements: ["draft", "submitted", "under_review", "awaiting_signature", "active", "paused", "cancelled", "awaiting_renewal"], required: true },
      { key: "requested_due_day", kind: "integer", required: false, min: 1, max: 28 },
      { key: "approved_due_day", kind: "integer", required: false, min: 1, max: 28 },
      { key: "monthly_fee_cents", kind: "integer", required: false, min: 0 },
      { key: "discount_cents", kind: "integer", required: false, min: 0 },
      { key: "first_due_date", kind: "datetime", required: false },
      { key: "contract_start", kind: "datetime", required: false },
      { key: "contract_end", kind: "datetime", required: false },
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
    schedule: "15 3 * * *",
    root: "appwrite/functions/daily-operations"
  },
  {
    id: APPWRITE_IDS.functions.backup,
    name: "Backup",
    schedule: "45 3 * * *",
    root: "appwrite/functions/backup"
  }
] as const;
