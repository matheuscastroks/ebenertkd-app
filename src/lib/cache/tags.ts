export const CACHE_TAGS = {
  trainingClasses: "training-classes",
  trainingClass: (id: string) => `training-class:${id}`,
  enrollments: "enrollments",
  studentAccess: "student-access",
  examEvents: "exam-events",
  examEvent: (id: string) => `exam-event:${id}`,
  contractTemplate: "contract-template",
  cancellations: "cancellations",
  billingCharges: "billing-charges",
  notificationPreferences: "notification-prefs",
} as const;
