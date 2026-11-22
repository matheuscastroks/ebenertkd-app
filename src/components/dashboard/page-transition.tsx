/// <reference types="react/canary" />
"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useNavItems } from "@/components/dashboard/section-nav";
import { resolveNavLocation } from "@/lib/navigation/routes";

/**
 * Transição lado a lado entre seções e telas de detalhe:
 * - Trocar entre abas/segmentos irmãos da mesma seção (ou dentro de um dependente) mantém
 *   a mesma chave de transição para não animar nem remontar o cabeçalho e a barra de abas.
 * - Barra lateral e navegação inferior ficam fora deste bloco e não se movem.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const items = useNavItems();
  const { section, isDetail } = resolveNavLocation(items, pathname);
  const dependentMatch = /^\/responsavel\/dependentes\/([^/]+)/.exec(pathname);

  const transitionKey = dependentMatch
    ? `/responsavel/dependentes/${dependentMatch[1]}`
    : isDetail
      ? pathname
      : (section?.href ?? pathname);

  return (
    <ViewTransition key={transitionKey} enter="t-page-side" exit="t-page-side" default="none">
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-sidebar md:h-full md:min-h-0 md:overflow-hidden">
        {children}
      </div>
    </ViewTransition>
  );
}
