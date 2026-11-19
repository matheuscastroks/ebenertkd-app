import type { EligibilityRule } from "@/features/events/schemas";
import { AGE_CLASSES } from "@/features/events/rules/eligibility-rules";
import type { RankKey } from "@/features/academy/ranks";
import type { EventModality } from "@/features/events/types";

export type PresetSex = "M" | "F";
export type PresetAgeClassKey = (typeof AGE_CLASSES)[number]["key"];

export const PRESET_SEX_LABEL: Record<PresetSex, string> = { M: "Masculino", F: "Feminino" };

/**
 * Divisões de peso (limite superior em kg; a última categoria é "acima do último limite") por classe de idade.
 * São referências comuns de regulamentos estaduais e da World Taekwondo: o edital do campeonato manda,
 * por isso o professor sempre pode editar as categorias geradas.
 */
export const WEIGHT_DIVISIONS_KG: Record<PresetAgeClassKey, Record<PresetSex, readonly number[]>> = {
  infantil: { M: [24, 28, 32, 36, 40, 44], F: [24, 28, 32, 36, 40, 44] },
  cadete: { M: [33, 37, 41, 45, 49, 53, 57, 61, 65], F: [29, 33, 37, 41, 44, 47, 51, 55, 59] },
  juvenil: { M: [45, 48, 51, 55, 59, 63, 68, 73, 78], F: [42, 44, 46, 49, 52, 55, 59, 63, 68] },
  adulto: { M: [58, 68, 80], F: [49, 57, 67] },
  master: { M: [58, 68, 80], F: [49, 57, 67] }
};

export type PresetInput = {
  modality: Extract<EventModality, "kyorugi" | "poomsae">;
  ageClassKeys: readonly PresetAgeClassKey[];
  sexes: readonly PresetSex[];
  /** Custos da academia por atleta (centavos). */
  priceCents?: number;
  /** Taxa da federação por atleta (centavos). */
  federationFeeCents?: number;
  /** Graduação mínima (opcional), aplicada a todas as categorias. */
  minRankKey?: RankKey;
};

export type PresetOption = {
  label: string;
  modality: PresetInput["modality"];
  priceCents: number;
  federationFeeCents: number;
  eligibility: EligibilityRule;
};

const MODALITY_LABEL = { kyorugi: "Kyorugi", poomsae: "Poomsae" } as const;
const SEX_SHORT = { M: "Masc.", F: "Fem." } as const;

/** Gera as categorias por modalidade, classe de idade, sexo e (no kyorugi) peso. Ordem estável: idade, sexo, peso. */
export function buildCategoryPresets(input: PresetInput): PresetOption[] {
  const options: PresetOption[] = [];
  const classes = AGE_CLASSES.filter((entry) => input.ageClassKeys.includes(entry.key));
  for (const ageClass of classes) {
    for (const sex of input.sexes) {
      const base: EligibilityRule = {
        ...(ageClass.min > 0 ? { min_age: ageClass.min } : {}),
        ...(ageClass.max < 200 ? { max_age: ageClass.max } : {}),
        sex,
        ...(input.minRankKey ? { min_rank_key: input.minRankKey } : {})
      };
      const common = { modality: input.modality, priceCents: input.priceCents ?? 0, federationFeeCents: input.federationFeeCents ?? 0 };
      const prefix = `${MODALITY_LABEL[input.modality]} ${ageClass.label} ${SEX_SHORT[sex]}`;
      if (input.modality === "poomsae") {
        options.push({ ...common, label: prefix, eligibility: base });
        continue;
      }
      const limits = WEIGHT_DIVISIONS_KG[ageClass.key][sex];
      limits.forEach((limit, index) => {
        const previous = index === 0 ? undefined : limits[index - 1];
        options.push({
          ...common,
          label: `${prefix} -${limit} kg`,
          eligibility: { ...base, ...(previous !== undefined ? { min_weight_grams: previous * 1000 } : {}), max_weight_grams: limit * 1000 }
        });
      });
      const last = limits[limits.length - 1];
      options.push({ ...common, label: `${prefix} +${last} kg`, eligibility: { ...base, min_weight_grams: last * 1000 } });
    }
  }
  return options.slice(0, 30);
}

/** `students.sex` (feminino|masculino) → sexo usado nas regras de categoria. */
export function eligibilitySexOf(sex: string | null | undefined): PresetSex | null {
  if (sex === "masculino") return "M";
  if (sex === "feminino") return "F";
  return null;
}
