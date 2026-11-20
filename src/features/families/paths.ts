import { guardianAttendancePath, guardianBillingPath, guardianContractsPath, guardianEnrollmentPath, guardianEventsPath, guardianExamsPath, guardianParqPath, ROUTES, type NavSegment } from "@/lib/navigation/routes";

/** Resumo de um dependente. Rota própria do portal da família (não aparece no menu). */
export function dependentSummaryPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}`;
}

/**
 * Segmentos das telas de um dependente (pilha a partir de Família), na ordem de uso:
 * rotina, documentos, dinheiro. Rótulos iguais aos do aluno.
 */
export function dependentSegments(profileId: string): NavSegment[] {
  return [
    { label: "Resumo", href: dependentSummaryPath(profileId) },
    { label: "Frequência", href: guardianAttendancePath(profileId) },
    { label: "Exames", href: guardianExamsPath(profileId) },
    { label: "Eventos", href: guardianEventsPath(profileId) },
    { label: "Ficha", href: guardianEnrollmentPath(profileId) },
    { label: "Saúde", href: guardianParqPath(profileId) },
    { label: "Contratos", href: guardianContractsPath(profileId) },
    { label: "Pagamentos", href: guardianBillingPath(profileId) },
  ];
}

/** Acesso e senha do dependente: abre o item certo na tela de acessos. */
export function dependentAccessPath(profileId: string) {
  return `${ROUTES.guardianDependents}?acesso=${encodeURIComponent(profileId)}#dependente-${profileId}`;
}
