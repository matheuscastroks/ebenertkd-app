import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Envolve campos que devem tremer quando surge um erro (`t-shake` em `globals.css`).
 * A `key` muda junto com o erro, então cada erro novo remonta o bloco e o tremor toca de novo,
 * sem precisar de efeito.
 */
export function ShakeOnError({
  errorKey,
  className,
  children
}: {
  errorKey?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div key={errorKey ?? "sem-erro"} className={cn(errorKey && "t-shake", className)}>
      {children}
    </div>
  );
}

/** Mensagem de erro em texto, logo abaixo do campo, entrando com fade curto. */
export function FormErrorMessage({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} role="alert" className={cn("t-error-msg text-sm text-destructive", className)}>
      {children}
    </p>
  );
}
