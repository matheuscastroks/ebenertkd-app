import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand-icon.png"
        alt=""
        width={48}
        height={48}
        unoptimized
        priority
        className="size-12 shrink-0 object-contain"
      />
      <div className="leading-tight">
        <p className="text-base font-semibold">Ebener TKD</p>
        <p className="text-sm text-muted-foreground">Portal da academia</p>
      </div>
    </div>
  );
}

/**
 * Moldura comum das telas públicas de acesso (entrar, cadastro e recuperação).
 * No desktop a identidade da academia fica numa coluna própria; no mobile o formulário vem primeiro,
 * com a marca reduzida a uma linha.
 */
export function AuthShell({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section
        aria-label="Ebener TKD"
        className="hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <BrandMark />
        <div className="max-w-md space-y-3">
          <p className="text-3xl font-semibold tracking-tight text-balance">
            Aulas, graduações e mensalidades da academia em um só lugar.
          </p>
          <p className="text-base text-muted-foreground">
            Para alunos, responsáveis e professores.
          </p>
        </div>
      </section>

      <main className="flex min-h-dvh flex-col px-4 pt-6 pb-8 sm:px-6 lg:justify-center lg:py-12">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <BrandMark className="lg:hidden" />
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </header>
          {children}
          {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

/** Link de texto neutro: o laranja fica reservado à ação principal da tela. */
export function AuthTextLink({ href, children, standalone = false }: { href: string; children: ReactNode; standalone?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-sm font-medium text-foreground underline! decoration-muted-foreground! underline-offset-4 transition-colors duration-150 hover:decoration-foreground! focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
        standalone && "inline-flex min-h-11 items-center"
      )}
    >
      {children}
    </Link>
  );
}
