import type { EligibilityRule } from "@/features/events/schemas";
import { ageClassOf, eventAge, evaluateEventEligibility, formatWeightKg, type EventAthlete } from "@/features/events/rules/eligibility-rules";
import type { EventAgeCutoff } from "@/features/events/types";
import type { RankKey } from "@/features/academy/ranks";

export type SuggestableOption = { id: string; label: string; rule: EligibilityRule; sortOrder?: number };

export type CategorySuggestion = {
  /** Primeira opção elegível, na ordem de cadastro; null se nenhuma serve. */
  suggestedOptionId: string | null;
  eligibleOptionIds: string[];
  ineligible: Array<{ optionId: string; reasons: string[] }>;
  ageClass: string | null;
};

/** Sugere a categoria do atleta (idade, peso, faixa) entre as opções do evento. Pura. */
export function suggestCategory(input: {
  options: readonly SuggestableOption[];
  athlete: EventAthlete;
  event: { startsAt: string; ageCutoff: EventAgeCutoff };
  rankLabel?: (key: RankKey) => string;
}): CategorySuggestion {
  const ordered = [...input.options].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const eligibleOptionIds: string[] = [];
  const ineligible: CategorySuggestion["ineligible"] = [];
  for (const option of ordered) {
    const result = evaluateEventEligibility({ rule: option.rule, athlete: input.athlete, event: input.event, rankLabel: input.rankLabel });
    if (result.eligible) eligibleOptionIds.push(option.id);
    else ineligible.push({ optionId: option.id, reasons: result.reasons });
  }
  const age = eventAge(input.athlete.birthDate, input.event.startsAt, input.event.ageCutoff);
  return { suggestedOptionId: eligibleOptionIds[0] ?? null, eligibleOptionIds, ineligible, ageClass: ageClassOf(age)?.label ?? null };
}

export type WeightRange = { minGrams?: number; maxGrams?: number };

/** O peso declarado cabe na faixa da categoria? Sem faixa, qualquer peso serve. */
export function weightFits(range: WeightRange | undefined, grams: number | null | undefined) {
  if (!range) return true;
  if (grams == null) return false;
  if (range.minGrams !== undefined && grams < range.minGrams) return false;
  if (range.maxGrams !== undefined && grams > range.maxGrams) return false;
  return true;
}

/** Explica por que o peso não cabe ("peso acima do máximo: 45 kg"); null se cabe ou não há peso para comparar. */
export function weightMisfitReason(range: WeightRange | undefined, grams: number | null | undefined) {
  if (!range || grams == null) return null;
  if (range.minGrams !== undefined && grams < range.minGrams) return `peso abaixo do mínimo: ${formatWeightKg(range.minGrams)}`;
  if (range.maxGrams !== undefined && grams > range.maxGrams) return `peso acima do máximo: ${formatWeightKg(range.maxGrams)}`;
  return null;
}

/**
 * Categoria sugerida pelo peso entre as opções já elegíveis (idade, sexo e faixa): a primeira, na ordem de
 * cadastro, cujo peso cabe. Pura, usada ao vivo no formulário de inscrição.
 */
export function suggestOptionByWeight<T extends { id: string; eligible: boolean; range?: WeightRange }>(options: readonly T[], grams: number | null | undefined) {
  return options.find((option) => option.eligible && weightFits(option.range, grams)) ?? null;
}
