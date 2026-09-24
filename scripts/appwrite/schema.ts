import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

export type ColumnDefinition =
  | { key: string; kind: "varchar"; size: number; required: boolean; array?: boolean }
  | { key: string; kind: "text"; required: boolean }
  | { key: string; kind: "datetime"; required: boolean }
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
