import { ageInYears } from "@/features/exams/eligibility-rules";
import { isRankKey, rankOrder, type RankKey } from "@/features/academy/ranks";
import type { EligibilityRule } from "@/features/events/schemas";
import type { EventAgeCutoff } from "@/features/events/types";
import { saoPauloToday } from "@/lib/dates";

export type EventAthlete = {
  rankKey?: string | null;
  birthDate?: string | null;
  sex?: "M" | "F" | null;
  weightGrams?: number | null;
  hasActiveEnrollment: boolean;
  hasOverdueCharges: boolean;
};

export type EligibilityResult = { eligible: boolean; reasons: string[] };

/**
 * Idade para classificar o atleta. Por padrão conta pelo ano de nascimento (idade que completa no
 * ano do evento); `event_date` usa a idade exata no dia do evento. Retorna null sem nascimento.
 */
export function eventAge(birthDate: string | null | undefined, startsAt: string, cutoff: EventAgeCutoff): number | null {
  const birth = birthDate?.slice(0, 10);
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const eventDay = saoPauloToday(new Date(startsAt));
  if (cutoff === "birth_year") {
    const age = Number(eventDay.slice(0, 4)) - Number(birth.slice(0, 4));
    return age >= 0 ? age : null;
  }
  return ageInYears(birth, eventDay);
}

export const AGE_CLASSES = [
  { key: "infantil", label: "Infantil", min: 0, max: 11 },
  { key: "cadete", label: "Cadete", min: 12, max: 14 },
  { key: "juvenil", label: "Juvenil", min: 15, max: 17 },
  { key: "adulto", label: "Adulto", min: 18, max: 32 },
  { key: "master", label: "Master", min: 33, max: 200 }
] as const;

export function ageClassOf(age: number | null) {
  if (age === null) return null;
  return AGE_CLASSES.find((entry) => age >= entry.min && age <= entry.max) ?? null;
}

export function formatWeightKg(grams: number) {
  return `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

/** Avalia uma opção para um atleta. Os motivos são legíveis ("faixa abaixo do mínimo: exige 8º gub"). */
export function evaluateEventEligibility(input: {
  rule: EligibilityRule;
  athlete: EventAthlete;
  event: { startsAt: string; ageCutoff: EventAgeCutoff };
  rankLabel?: (key: RankKey) => string;
}): EligibilityResult {
  const { rule, athlete } = input;
  const label = input.rankLabel ?? ((key: RankKey) => key);
  const reasons: string[] = [];

  if (rule.require_active_enrollment && !athlete.hasActiveEnrollment) reasons.push("matrícula ativa necessária");
  if (rule.require_no_overdue && athlete.hasOverdueCharges) reasons.push("há cobrança em atraso");

  if (rule.min_rank_key || rule.max_rank_key) {
    if (!isRankKey(athlete.rankKey)) {
      reasons.push("graduação do atleta não informada");
    } else {
      if (rule.min_rank_key && isRankKey(rule.min_rank_key) && rankOrder(athlete.rankKey) < rankOrder(rule.min_rank_key)) {
        reasons.push(`graduação abaixo do mínimo: exige ${label(rule.min_rank_key)}`);
      }
      if (rule.max_rank_key && isRankKey(rule.max_rank_key) && rankOrder(athlete.rankKey) > rankOrder(rule.max_rank_key)) {
        reasons.push(`graduação acima do máximo: até ${label(rule.max_rank_key)}`);
      }
    }
  }

  if (rule.min_age !== undefined || rule.max_age !== undefined) {
    const age = eventAge(athlete.birthDate, input.event.startsAt, input.event.ageCutoff);
    if (age === null) {
      reasons.push("data de nascimento não informada");
    } else {
      if (rule.min_age !== undefined && age < rule.min_age) reasons.push(`idade abaixo do mínimo: ${rule.min_age} anos`);
      if (rule.max_age !== undefined && age > rule.max_age) reasons.push(`idade acima do máximo: ${rule.max_age} anos`);
    }
  }

  if (rule.sex) {
    if (!athlete.sex) reasons.push("sexo não informado");
    else if (athlete.sex !== rule.sex) reasons.push(rule.sex === "M" ? "categoria masculina" : "categoria feminina");
  }

  if (rule.min_weight_grams !== undefined || rule.max_weight_grams !== undefined) {
    if (athlete.weightGrams == null) {
      reasons.push("peso não informado");
    } else {
      if (rule.min_weight_grams !== undefined && athlete.weightGrams < rule.min_weight_grams) reasons.push(`peso abaixo do mínimo: ${formatWeightKg(rule.min_weight_grams)}`);
      if (rule.max_weight_grams !== undefined && athlete.weightGrams > rule.max_weight_grams) reasons.push(`peso acima do máximo: ${formatWeightKg(rule.max_weight_grams)}`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
