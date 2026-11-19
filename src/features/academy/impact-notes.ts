import type { AccessPolicy, BillingPolicy, ContractPolicy } from "@/features/academy/defaults";
import { formatBrl } from "@/lib/money";

/** Avisos em texto mostrados antes de confirmar. Só aparecem para o que realmente mudou. */
export function billingImpactNotes(before: BillingPolicy, after: BillingPolicy): string[] {
  const notes: string[] = [];
  if (before.default_monthly_fee_cents !== after.default_monthly_fee_cents) {
    notes.push(`A mensalidade padrão passa de ${formatBrl(before.default_monthly_fee_cents)} para ${formatBrl(after.default_monthly_fee_cents)} e vale apenas para novas matrículas. Para os alunos atuais, use Reajuste de mensalidade.`);
  }
  if (before.enrollment_fee_enabled !== after.enrollment_fee_enabled || before.enrollment_fee_cents !== after.enrollment_fee_cents) {
    notes.push(after.enrollment_fee_enabled
      ? `A taxa de matrícula de ${formatBrl(after.enrollment_fee_cents)} será cobrada nas próximas aprovações. Matrículas já aprovadas não mudam.`
      : "A taxa de matrícula deixa de ser cobrada nas próximas aprovações.");
  }
  const removed = before.due_day_options.filter((day) => !after.due_day_options.includes(day));
  if (removed.length > 0) {
    notes.push(`Os dias ${removed.join(", ")} deixam de ser oferecidos para novas fichas. Matrículas que já usam esses dias continuam como estão.`);
  }
  if (before.adjustment_min_notice_days !== after.adjustment_min_notice_days) {
    notes.push(`O aviso mínimo de reajuste passa a ser de ${after.adjustment_min_notice_days} dias nas próximas campanhas.`);
  }
  return notes;
}

export function accessImpactNotes(before: AccessPolicy, after: AccessPolicy): string[] {
  const notes: string[] = [];
  if (before.enabled && !after.enabled) notes.push("O bloqueio de acesso por mensalidade será desligado: ninguém ficará bloqueado por atraso.");
  if (!before.enabled && after.enabled) notes.push("O bloqueio de acesso por mensalidade será ligado: alunos sem pagamento dentro da janela podem ficar bloqueados.");
  if (after.enabled && before.window_days !== after.window_days) {
    notes.push(`A janela de acesso após o pagamento passa de ${before.window_days} para ${after.window_days} dias. Use o cálculo de impacto para ver quantos alunos seriam afetados hoje.`);
  }
  return notes;
}

export function contractImpactNotes(before: ContractPolicy, after: ContractPolicy, templateUsesVariables: boolean | null): string[] {
  const notes: string[] = [];
  const rulesChanged = before.cancellation_notice_day !== after.cancellation_notice_day
    || before.exit_fee_mode !== after.exit_fee_mode
    || before.exit_fee_cents !== after.exit_fee_cents
    || before.rematriculation_after_months !== after.rematriculation_after_months;
  if (rulesChanged) {
    notes.push("Contratos já assinados mantêm a regra de cancelamento da época da assinatura. A nova regra vale para os contratos emitidos a partir de agora.");
    if (templateUsesVariables === false) {
      notes.push("O texto do modelo publicado não usa as variáveis de cancelamento: publique uma nova versão do modelo para o contrato refletir a regra.");
    }
  }
  if (before.default_duration_months !== after.default_duration_months) {
    notes.push(`A duração sugerida passa a ser de ${after.default_duration_months} meses em novas aprovações e renovações (você ainda pode ajustar as datas).`);
  }
  return notes;
}

/** O texto publicado cita as variáveis de cancelamento? (aviso para publicar nova versão) */
export function templateUsesCancellationVariables(content: string): boolean {
  return /{{\s*(contrato\.dia_limite_cancelamento|contract\.cancellation_notice_day)\s*}}/i.test(content)
    && /{{\s*(contrato\.encargo_saida|contract\.exit_fee)\s*}}/i.test(content);
}
