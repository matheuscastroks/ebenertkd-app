export const ROUTES = {
  home: "/",
  admin: "/admin",
  adminEnrollments: "/admin/matriculas",
  adminClasses: "/admin/turmas",
  student: "/aluno",
  studentEnrollment: "/aluno/matricula",
  guardian: "/responsavel",
  guardianDependents: "/responsavel/dependentes"
} as const;

export function adminEnrollmentPath(studentId: string) {
  return `${ROUTES.adminEnrollments}/${encodeURIComponent(studentId)}`;
}

export function guardianEnrollmentPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/matricula`;
}
