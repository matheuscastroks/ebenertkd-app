"use client";

import { useAcademyBrand } from "@/components/academy-config-provider";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

function BrandMark({ className }: { className?: string }) {
  const { shortName } = useAcademyBrand();
  return (
    <div className={cn("flex items-center gap-2.5 lg:gap-3", className)}>
      <Image
        src="/brand-icon.png"
        alt=""
        width={44}
        height={44}
        unoptimized
        priority
        className="size-9 shrink-0 object-contain lg:size-11"
      />
      <div className="leading-tight">
        <p className="text-sm font-semibold lg:text-base">{shortName}</p>
        <p className="text-xs text-muted-foreground lg:text-sm">Portal da academia</p>
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
  const { shortName } = useAcademyBrand();
  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section
        aria-label={shortName}
        className="hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-10"
      >
        <BrandMark />
        <div className="max-w-md space-y-3">
          <p className="text-3xl font-semibold tracking-tight text-balance">
            Seus treinos, exames de faixa e a rotina da família em um só lugar.
          </p>
          <p className="text-base text-muted-foreground">
            Acompanhe sua evolução no tatame ou gerencie a matrícula e as mensalidades dos seus filhos.
          </p>
        </div>
      </section>

      <main className="flex min-h-dvh flex-col justify-center px-4 py-4 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:py-6">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3.5">
          <BrandMark className="lg:hidden" />
          <header className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </header>
          {children}
          {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
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
        "rounded-sm font-medium text-foreground underline! decoration-muted-foreground! underline-offset-4 transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:decoration-foreground! focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
        standalone && "inline-flex min-h-11 items-center"
      )}
    >
      {children}
    </Link>
  );
}
