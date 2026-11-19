/**
 * Todas as tags do cache de dados. Quem lê (`cachedRead`) e quem grava (`invalidateTags`)
 * importa daqui, para que leitura e invalidação nunca divirjam.
 */
export const CACHE_TAGS = {
  // Referência e catálogos
  trainingClasses: "training-classes",
  trainingClass: (id: string) => `training-class:${id}`,
  contractTemplate: "contract-template",
  billingSettings: "billing-settings",
  financeScenarios: "finance-scenarios",
  tuitionAdjustments: "tuition-adjustments",
  examEvents: "exam-events",
  examEvent: (id: string) => `exam-event:${id}`,
  // Perfis e sessão (autorização NUNCA vem do cache: só a linha do perfil)
  profiles: "profiles",
  profile: (profileId: string) => `profile:${profileId}`,
  profileAccount: (accountId: string) => `profile-account:${accountId}`,
  studentAccess: "student-access",
  // Operação do professor
  enrollments: "enrollments",
  billingCharges: "billing-charges",
  cancellations: "cancellations",
  contracts: "contracts",
  contract: (id: string) => `contract:${id}`,
  classEnrollments: "class-enrollments",
  operations: "operations",
  announcements: "announcements",
  // Por aluno
  student: (studentId: string) => `student:${studentId}`,
  studentProfile: (profileId: string) => `student-profile:${profileId}`,
  studentsAll: "students-all",
  parq: (studentId: string) => `parq:${studentId}`,
  parqAll: "parq-all",
  charges: (studentId: string) => `charges:${studentId}`,
  attendance: (studentId: string) => `attendance:${studentId}`,
  attendanceAll: "attendance-all",
  exams: (studentId: string) => `exams:${studentId}`,
  // Por aula e turma
  lesson: (lessonId: string) => `lesson:${lessonId}`,
  classLessons: (classId: string) => `class-lessons:${classId}`,
  // Por usuário
  notifications: (profileId: string) => `notifications:${profileId}`,
  notificationPreferences: (accountId: string) => `notification-prefs:${accountId}`,
  push: (profileId: string) => `push:${profileId}`
} as const;
