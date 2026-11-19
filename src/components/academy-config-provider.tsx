"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_BILLING_POLICY } from "@/features/academy/defaults";
import { DEFAULT_ACADEMY_BRAND, professorLabel, type AcademyBrand } from "@/features/academy/identity-rules";

/** Configuração pública da academia para componentes de cliente. Sem documento nem contatos. */
export type PublicAcademyConfig = AcademyBrand & { dueDayOptions: number[]; professorLabel: string };

const DEFAULT_PUBLIC_CONFIG: PublicAcademyConfig = {
  ...DEFAULT_ACADEMY_BRAND,
  dueDayOptions: DEFAULT_BILLING_POLICY.due_day_options,
  professorLabel: professorLabel(DEFAULT_ACADEMY_IDENTITY)
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
