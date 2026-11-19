import type { EligibilityRule } from "@/features/events/schemas";
import { ageClassOf, eventAge, evaluateEventEligibility, type EventAthlete } from "@/features/events/rules/eligibility-rules";
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
