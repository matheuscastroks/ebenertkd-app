import type { ReactNode } from "react";

/**
 * Ações do cabeçalho da página. No celular ocupam uma linha própria abaixo do título
 * (com quebra de linha) para nunca ultrapassar a largura da tela; no desktop ficam
 * alinhadas à direita, na mesma linha do título.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="header-actions"
      className="order-last flex w-full min-w-0 flex-wrap items-center gap-2 md:order-none md:w-auto md:shrink-0 md:justify-end"
    >
      {children}
    </div>
  );
}
