export const APPWRITE_IDS = {
  database: "ebenertkd",
  bucket: "private-files",
  tables: {
    profiles: "profiles",
    guardianStudentLinks: "guardian_student_links",
    trainingClasses: "training_classes",
    students: "students",
    enrollments: "enrollments",
    studentDocuments: "student_documents",
    enrollmentReviews: "enrollment_reviews",
    contractTemplates: "contract_templates",
    contractVersions: "contract_versions",
    contracts: "contracts",
    contractSignatures: "contract_signatures",
    cancellationRequests: "cancellation_requests",
    charges: "charges",
    paymentProofs: "payment_proofs",
    payments: "payments",
    paymentReversals: "payment_reversals",
    billingSettings: "billing_settings",
    auditEvents: "audit_events",
    automationRuns: "automation_runs"
  },
  functions: {
    dailyOperations: "daily-operations",
    backup: "backup"
  }
} as const;

export const APPWRITE_SESSION_COOKIE = "ebenertkd-session";
