"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PUBLIC_RANKS, type PublicRank } from "@/features/academy/belt-rules";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_BELTS_POLICY, DEFAULT_BILLING_POLICY } from "@/features/academy/defaults";
import { DEFAULT_ACADEMY_BRAND, professorLabel, type AcademyBrand } from "@/features/academy/identity-rules";

/** Configuração pública da academia para componentes de cliente. Sem documento nem contatos. */
export type PublicAcademyConfig = AcademyBrand & {
  dueDayOptions: number[];
  professorLabel: string;
  /** Graduações com nome e cor configurados (as 23 do catálogo; `enabled` diz quais a academia usa). */
  ranks: readonly PublicRank[];
  /** "Poomsae"/"Tul" e "Gub"/"Gup"/"Geup". */
  formLabel: string;
  levelLabel: string;
};

const DEFAULT_PUBLIC_CONFIG: PublicAcademyConfig = {
  ...DEFAULT_ACADEMY_BRAND,
  dueDayOptions: DEFAULT_BILLING_POLICY.due_day_options,
  professorLabel: professorLabel(DEFAULT_ACADEMY_IDENTITY),
  ranks: DEFAULT_PUBLIC_RANKS,
  formLabel: DEFAULT_BELTS_POLICY.form_label,
  levelLabel: DEFAULT_BELTS_POLICY.level_label
};

const AcademyConfigContext = createContext<PublicAcademyConfig>(DEFAULT_PUBLIC_CONFIG);

export function AcademyConfigProvider({ value, children }: { value: PublicAcademyConfig; children: ReactNode }) {
  return <AcademyConfigContext.Provider value={value}>{children}</AcademyConfigContext.Provider>;
}

/** Sem provedor (testes, telas isoladas) devolve os valores atuais do código. */
export function useAcademyBrand(): AcademyBrand {
  const { shortName, displayName } = useContext(AcademyConfigContext);
  return { shortName, displayName };
}

export function useDueDayOptions(): number[] {
  return useContext(AcademyConfigContext).dueDayOptions;
}

export function useProfessorLabel(): string {
  return useContext(AcademyConfigContext).professorLabel;
}

/** Graduações configuradas (nome, cor, estilo). Sem provedor, os padrões do código. */
export function useBeltRanks(): readonly PublicRank[] {
  return useContext(AcademyConfigContext).ranks;
}

export function useBeltLabels(): { formLabel: string; levelLabel: string } {
  const { formLabel, levelLabel } = useContext(AcademyConfigContext);
  return { formLabel, levelLabel };
}
