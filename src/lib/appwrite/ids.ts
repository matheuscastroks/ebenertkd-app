export const APPWRITE_IDS = {
  database: "ebenertkd",
  bucket: "private-files",
  tables: {
    profiles: "profiles",
    guardianStudentLinks: "guardian_student_links",
    auditEvents: "audit_events",
    automationRuns: "automation_runs"
  },
  functions: {
    dailyOperations: "daily-operations",
    backup: "backup"
  }
} as const;

export const APPWRITE_SESSION_COOKIE = "ebenertkd-session";
