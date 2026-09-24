export const ROUTES = {
  home: "/",
  admin: "/admin",
  adminEnrollments: "/admin/matriculas",
  adminClasses: "/admin/turmas",
  adminContracts: "/admin/contratos",
  adminContractTemplate: "/admin/contratos/modelo",
  adminCancellations: "/admin/contratos/cancelamentos",
  student: "/aluno",
  studentEnrollment: "/aluno/matricula",
  studentContracts: "/aluno/contratos",
  guardian: "/responsavel",
  guardianDependents: "/responsavel/dependentes"
} as const;

export function adminEnrollmentPath(studentId: string) {
  return `${ROUTES.adminEnrollments}/${encodeURIComponent(studentId)}`;
}

export function guardianEnrollmentPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/matricula`;
}

export function studentContractPath(contractId: string) {
  return `${ROUTES.studentContracts}/${encodeURIComponent(contractId)}`;
}

export function guardianContractsPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/contratos`;
}

export function guardianContractPath(profileId: string, contractId: string) {
  return `${guardianContractsPath(profileId)}/${encodeURIComponent(contractId)}`;
}
