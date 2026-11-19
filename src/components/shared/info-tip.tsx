"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp, Info } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ícone (?) ou (i) com explicação curta. Abre ao passar o mouse, ao focar pelo teclado e também ao tocar
 * (no celular não existe hover). Precisa de um `TooltipProvider` acima na árvore.
 */
export function InfoTip({
  label,
  children,
  icon = "help",
  side = "top",
  className
}: {
  /** Nome acessível do botão, ex.: "Sobre a inadimplência esperada". */
  label: string;
  children: ReactNode;
  icon?: "help" | "info";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icon === "info" ? Info : CircleHelp;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => {
            event.preventDefault();
            setOpen((current) => !current);
          }}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            className
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="block max-w-72 text-left leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
