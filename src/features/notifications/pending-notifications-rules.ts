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
}): PendingNotificationSpec[] {
  const specs: PendingNotificationSpec[] = [];
  const { student, enrollment, parq, charges, contracts, access, links, isGuardianView, includeFinancial, referenceDate } = input;
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
      title: `${subjectPrefix}Complete sua ficha de matrícula`,
      body: isGuardianView
        ? `A ficha de matrícula de ${student.full_name} ainda está incompleta. Envie os dados para o professor liberar a matrícula.`
        : "Sua ficha de matrícula ainda está em rascunho. Complete os dados e envie para análise do professor.",
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
        title: `${subjectPrefix}Contrato pronto para assinatura`,
        body: isGuardianView
          ? `O contrato de matrícula de ${student.full_name} foi liberado pelo professor. Leia e assine para concluir.`
          : "Seu contrato de matrícula foi liberado pelo professor. Leia e assine pelo aplicativo para ativar sua matrícula.",
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
        title: `${subjectPrefix}Falta responder o questionário de saúde`,
        body: isGuardianView
          ? `Responda as 10 perguntas anuais de saúde de ${student.full_name}. Leva menos de 2 minutos e ajuda o professor a cuidar dos treinos.`
          : "Responda 10 perguntas rápidas sobre sua saúde uma vez por ano para treinar com segurança.",
        actionUrl: links.parq,
        dedupeKey: `pending:parq-missing:${student.$id}`,
      });
    } else if (parq.status === "expiring_soon" && parq.expiresAt) {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}Questionário de saúde vence em breve`,
        body: isGuardianView
          ? `O questionário anual de saúde de ${student.full_name} vence em ${formatBusinessDateBr(parq.expiresAt)}. Renove agora pelo portal.`
          : `Seu questionário de saúde anual vence em ${formatBusinessDateBr(parq.expiresAt)}. Responda novamente em menos de 2 minutos.`,
        actionUrl: links.parq,
        dedupeKey: `pending:parq-expiring:${parq.submissionId ?? student.$id}:${parq.expiresAt}`,
      });
    } else if (parq.status === "expired") {
      specs.push({
        kind: "system",
        title: `${subjectPrefix}Renove o questionário de saúde anual`,
        body: isGuardianView
          ? `O questionário anual de saúde de ${student.full_name} venceu. Atualize as respostas para manter a ficha em dia.`
          : "Seu questionário de saúde anual venceu. Atualize suas respostas para manter sua ficha em dia.",
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
        title: `${subjectPrefix}Acesso ao aplicativo pausado`,
        body: isGuardianView
          ? `O ciclo mensal de acesso de ${student.full_name} expirou. Envie o comprovante PIX no financeiro para liberar o app imediatamente.`
          : `Seu ciclo de ${access.windowDays} dias após o último pagamento expirou. Envie o comprovante PIX no financeiro para liberar o aplicativo na hora.`,
        actionUrl: links.billing,
        dedupeKey: `pending:access-locked:${student.$id}:${access.accessValidUntil ?? referenceDay}`,
      });
    } else if (access?.status === "expiring_soon" && access.accessValidUntil) {
      specs.push({
        kind: "payment_reminder",
        title: `${subjectPrefix}Ciclo mensal de acesso vence em breve`,
        body: isGuardianView
          ? `O acesso de ${student.full_name} ao aplicativo vale até ${formatBusinessDateBr(access.accessValidUntil)}. Envie o comprovante da mensalidade para evitar pausa.`
          : `Seu acesso ao aplicativo vale até ${formatBusinessDateBr(access.accessValidUntil)}. Envie o comprovante da mensalidade para continuar sem pausas.`,
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
          body: `${charge.description} (${formatBrl(charge.amount_cents)}) venceu em ${formatBusinessDateBr(dueDay)}. Copie a chave PIX e envie o comprovante no financeiro.`,
          actionUrl: links.billing,
          dedupeKey: `pending:charge-overdue:${charge.$id}`,
        });
      } else if (status === "pending") {
        const daysLeft = daysBetweenIsoDates(referenceDay, dueDay);
        if (daysLeft <= 7) {
          specs.push({
            kind: "payment_reminder",
            title: `${subjectPrefix}${charge.description} vence ${daysLeft <= 0 ? "hoje" : daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`}`,
            body: `${charge.description} (${formatBrl(charge.amount_cents)}) tem vencimento em ${formatBusinessDateBr(dueDay)}. Você já pode enviar o comprovante PIX pelo financeiro.`,
            actionUrl: links.billing,
            dedupeKey: `pending:charge-due-soon:${charge.$id}`,
          });
        }
      }
    }
  }

  return specs;
}
