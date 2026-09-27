import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { getBeltTheme } from "@/features/students/options";

export type BeltProgressionPillProps = {
  fromBelt?: string | null;
  fromGub?: number | null;
  toBelt?: string | null;
  toGub?: number | null;
  belt?: string | null;
  gub?: number | null;
  size?: "sm" | "md" | "lg";
  showGub?: boolean;
  className?: string;
};

export function BeltProgressionPill({
  fromBelt,
  fromGub,
  toBelt,
  toGub,
  belt,
  gub,
  size = "md",
  showGub = true,
  className,
}: BeltProgressionPillProps) {
  const targetBelt = toBelt ?? belt;
  const targetGub = toGub ?? gub;
  const hasProgression = Boolean(fromBelt || fromGub != null);

  if (hasProgression) {
    const targetTheme = getBeltTheme(targetBelt, targetGub);

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2 py-1 shadow-xs transition-colors backdrop-blur-xs",
          size === "sm" && "text-xs py-0.5 px-1.5",
          size === "lg" && "text-sm py-1.5 px-3",
          className
        )}
        aria-label={`Progressão de faixa: ${fromBelt ?? `${fromGub}º GUB`} para ${targetBelt ?? `${targetGub}º GUB`}`}
      >
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 hidden sm:inline">
            Atual:
          </span>
          <BeltBadge
            belt={fromBelt}
            gub={fromGub}
            size={size === "lg" ? "md" : "sm"}
            showGub={showGub}
          />
        </div>

        <ArrowRight
          className={cn(
            "text-muted-foreground/70 shrink-0",
            size === "sm" ? "size-3" : "size-3.5"
          )}
          aria-hidden="true"
        />

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary/80 hidden sm:inline">
            Alvo:
          </span>
          <BeltBadge
            belt={targetBelt}
            gub={targetGub}
            size={size === "lg" ? "md" : "sm"}
            showGub={showGub}
            className={cn(
              "ring-1 ring-primary/20 font-semibold",
              targetTheme.isBlackBelt && "ring-amber-500/30"
            )}
          />
        </div>
      </div>
    );
  }

  // Single belt presentation with high-contrast semantic theme
  const theme = getBeltTheme(targetBelt, targetGub);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium shadow-xs transition-colors",
        theme.pillClass,
        size === "sm" && "text-xs py-0.5 px-2",
        size === "lg" && "text-sm py-1.5 px-3",
        className
      )}
      aria-label={`Faixa ${theme.name}${targetGub ? `, ${targetGub}º GUB` : ""}`}
    >
      <BeltBadge
        belt={targetBelt}
        gub={targetGub}
        size={size}
        showGub={showGub}
        className="border-none bg-transparent shadow-none px-0 h-auto"
      />
    </div>
  );
}
