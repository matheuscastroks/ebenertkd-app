import { DEFAULT_NOTIFICATIONS_POLICY } from "@/features/academy/defaults";
import type { StudentAppAccessState } from "@/features/billing/access-lock-rules";
import { effectiveChargeStatus } from "@/features/billing/rules";
import type { Charge } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import type { NotificationKind } from "@/features/notifications/types";
import type { ParqAssessment } from "@/features/students/parq-rules";
import type { Enrollment, Student } from "@/features/students/types";
import { daysBetweenIsoDates, formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";

export type PendingNotificationSpec = {
  kind: NotificationKind;
  title: string;
  body: string;
  actionUrl: string;
  dedupeKey: string;
};

export type PendingNotificationLinks = {
  enrollment: string;
  parq: string;
  billing: string;
  contract: (contractId: string) => string;
};

/**
 * Gera de forma pura e determinística todas as notificações automáticas de pendência
 * para um aluno (destinadas ao próprio adulto ou ao responsável do dependente).
 * Nunca deve ser chamada para gerar notificações financeiras para `minor_student`.
 */
export function buildPendingNotificationSpecs(input: {
  student: Student;
  enrollment: Enrollment | null;
  parq: ParqAssessment | null;
  charges: Charge[];
  contracts: Contract[];
  access: StudentAppAccessState | null;
  links: PendingNotificationLinks;
  isGuardianView: boolean;
  includeFinancial: boolean;
  referenceDate: string;
  /** Alerta de vencimento próximo: cobranças que vencem em até este número de dias (padrão 7). */
  dueSoonAlertDays?: number;
}): PendingNotificationSpec[] {
  const specs: PendingNotificationSpec[] = [];
  const { student, enrollment, parq, charges, contracts, access, links, isGuardianView, includeFinancial, referenceDate } = input;
  const dueSoonAlertDays = input.dueSoonAlertDays ?? DEFAULT_NOTIFICATIONS_POLICY.due_soon_alert_days;
  const subjectPrefix = isGuardianView ? `${student.full_name.split(" ")[0]}: ` : "";
  const referenceDay = referenceDate.slice(0, 10);
  const referenceIso = `${referenceDay}T12:00:00.000Z`;
  const isActiveEnrollment =
    enrollment?.status === "active" ||
    enrollment?.status === "awaiting_renewal" ||
    student.status === "active";

  // 1. Ficha de matrícula incompleta (rascunho)
  if (!enrollment || enrollment.status === "draft") {
    specs.push({
      kind: "system",
      title: `${subjectPrefix}Complete sua matrícula`,
      body: isGuardianView
        ? `Finalize a ficha de ${student.full_name} para análise.`
        : "Finalize e envie sua ficha de matrícula.",
      actionUrl: links.enrollment,
      dedupeKey: `pending:enrollment-draft:${student.$id}`,
    });
  }

  // 2. Contrato aguardando assinatura (somente quem pode assinar)
  if (includeFinancial) {
    const pendingContract = contracts.find((contract) => contract.status === "pending_signature");
    if (pendingContract) {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}Contrato pronto para assinar`,
        body: isGuardianView
          ? `Assine o contrato de ${student.full_name} para concluir.`
          : "Leia e assine seu contrato para ativar a matrícula.",
        actionUrl: links.contract(pendingContract.$id),
        dedupeKey: `pending:contract-signature:${pendingContract.$id}`,
      });
    }
  }

  // 3. Questionário de saúde anual (PAR-Q) pendente, vencendo em ≤ 30 dias ou vencido
  if (isActiveEnrollment && parq && parq.status !== "valid" && includeFinancial) {
    if (parq.status === "missing") {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}Questionário de saúde pendente`,
        body: isGuardianView
          ? `Responda o PAR-Q anual de ${student.full_name}.`
          : "Responda o PAR-Q anual (menos de 2 min).",
        actionUrl: links.parq,
        dedupeKey: `pending:parq-missing:${student.$id}`,
      });
    } else if (parq.status === "expiring_soon" && parq.expiresAt) {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}PAR-Q vence em breve`,
        body: isGuardianView
          ? `Questionário de ${student.full_name} vence em ${formatBusinessDateBr(parq.expiresAt)}.`
          : `Seu questionário de saúde vence em ${formatBusinessDateBr(parq.expiresAt)}.`,
        actionUrl: links.parq,
        dedupeKey: `pending:parq-expiring:${parq.submissionId ?? student.$id}:${parq.expiresAt}`,
      });
    } else if (parq.status === "expired") {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}Renove o questionário de saúde`,
        body: isGuardianView
          ? `O PAR-Q anual de ${student.full_name} venceu.`
          : "Seu PAR-Q anual venceu. Atualize suas respostas.",
        actionUrl: links.parq,
        dedupeKey: `pending:parq-expired:${parq.submissionId ?? student.$id}:${parq.expiresAt ?? "none"}`,
      });
    }
  }

  // 4. Pendências de pagamento e acesso mensal (NUNCA para menor)
  if (includeFinancial) {
    if (access?.locked) {
      specs.push({
        kind: "payment_reminder",
        title: `${subjectPrefix}Acesso ao app pausado`,
        body: isGuardianView
          ? `Envie o comprovante PIX de ${student.full_name} para reativar.`
          : "Envie o comprovante PIX no financeiro para liberar o app.",
        actionUrl: links.billing,
        dedupeKey: `pending:access-locked:${student.$id}:${access.accessValidUntil ?? referenceDay}`,
      });
    } else if (access?.status === "expiring_soon" && access.accessValidUntil) {
      specs.push({
        kind: "payment_reminder",
        title: `${subjectPrefix}Acesso vence em ${formatBusinessDateBr(access.accessValidUntil)}`,
        body: isGuardianView
          ? `Envie a mensalidade de ${student.full_name} para evitar pausa.`
          : "Envie o comprovante da mensalidade para evitar pausa.",
        actionUrl: links.billing,
        dedupeKey: `pending:access-expiring:${student.$id}:${access.accessValidUntil}`,
      });
    }

    const effectiveCharges = charges
      .filter((charge) => charge.status !== "cancelled" && charge.status !== "paid" && charge.status !== "proof_under_review")
      .map((charge) => ({
        charge,
        status: effectiveChargeStatus(charge.status, charge.due_date, referenceIso),
      }));

    for (const { charge, status } of effectiveCharges) {
      const dueDay = charge.due_date.slice(0, 10);
      if (status === "overdue") {
        specs.push({
          kind: "payment_reminder",
          title: `${subjectPrefix}${charge.description} em atraso`,
          body: `${formatBrl(charge.amount_cents)} · venceu em ${formatBusinessDateBr(dueDay)}. Envie o comprovante PIX.`,
          actionUrl: links.billing,
          dedupeKey: `pending:charge-overdue:${charge.$id}`,
        });
      } else if (status === "pending") {
        const daysLeft = daysBetweenIsoDates(referenceDay, dueDay);
        if (daysLeft <= dueSoonAlertDays) {
          specs.push({
            kind: "payment_reminder",
            title: `${subjectPrefix}${charge.description} vence ${daysLeft <= 0 ? "hoje" : daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`}`,
            body: `${formatBrl(charge.amount_cents)} · vencimento em ${formatBusinessDateBr(dueDay)}.`,
            actionUrl: links.billing,
            dedupeKey: `pending:charge-due-soon:${charge.$id}`,
          });
        }
      }
    }
  }

  return specs;
}
