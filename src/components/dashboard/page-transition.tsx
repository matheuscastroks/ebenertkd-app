/// <reference types="react/canary" />
"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Transição lado a lado entre telas: a tela antiga sai para a esquerda e a nova entra pela direita,
 * com fade e um leve desfoque (classe `t-page-side` em `globals.css`).
 *
 * A chave por rota faz o React tratar a tela antiga e a nova como saída/entrada. Barra lateral e
 * navegação inferior ficam fora deste bloco e não se movem. Atualizações sem troca de rota
 * (refresh, Suspense) não animam (`default="none"`).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="t-page-side" exit="t-page-side" default="none">
      <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-sidebar md:h-full md:min-h-0 md:overflow-hidden">
        {children}
      </div>
    </ViewTransition>
  );
}
