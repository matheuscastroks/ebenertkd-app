/** Valor da inscrição: a opção do participante mais os acompanhantes (preço de acompanhante do evento). */
export function registrationPriceCents(input: { optionPriceCents: number; companions: number; companionPriceCents?: number | null }) {
  return input.optionPriceCents + Math.max(0, input.companions) * (input.companionPriceCents ?? 0);
}

/** Decisão financeira exigida ao cancelar: cobrança em aberto é cancelada; paga exige crédito futuro ou manter. */
export function eventChargeCancellation(chargeStatus: string, decision?: "future_credit" | "keep_charge") {
  if (["pending", "overdue", "cancelled"].includes(chargeStatus)) return "cancel" as const;
  if (!decision) throw new Error("event_paid_charge_decision_required");
  return "preserve" as const;
}
