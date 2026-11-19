import { guardianAttendancePath, guardianBillingPath, guardianContractsPath, guardianEnrollmentPath, guardianEventsPath, guardianExamsPath, guardianParqPath, ROUTES } from "@/lib/navigation/routes";

/** Resumo de um dependente. Rota própria do portal da família (não aparece no menu). */
export function dependentSummaryPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}`;
}

/** Áreas de cada dependente, na ordem de uso: rotina, documentos, dinheiro. */
export function dependentSections(profileId: string) {
  return [
    { key: "frequencia", label: "Frequência", description: "Presenças mês a mês", href: guardianAttendancePath(profileId) },
    { key: "exames", label: "Exames", description: "Exames de faixa e resultados", href: guardianExamsPath(profileId) },
    { key: "eventos", label: "Eventos", description: "Aulões, seminários e confraternizações", href: guardianEventsPath(profileId) },
    { key: "parq", label: "Questionário de saúde", description: "10 perguntas anuais de saúde", href: guardianParqPath(profileId) },
    { key: "matricula", label: "Ficha", description: "Dados de matrícula e saúde", href: guardianEnrollmentPath(profileId) },
    { key: "contratos", label: "Contratos", description: "Assinatura e documentos", href: guardianContractsPath(profileId) },
    { key: "financeiro", label: "Financeiro", description: "Mensalidades e comprovantes", href: guardianBillingPath(profileId) }
  ] as const;
}
