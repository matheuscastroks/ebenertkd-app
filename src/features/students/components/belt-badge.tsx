import { cn } from "@/lib/utils";
import { type BeltOption, type GubOption, beltForGub } from "@/features/students/options";

export type BeltVisualConfig = {
  name: string;
  gub?: number;
  bgClass: string;
  borderClass: string;
  textClass: string;
  tipClass?: string;
  isBlackBelt?: boolean;
};

const BELT_CONFIGS: Record<string, BeltVisualConfig> = {
  "cinza": {
    name: "Cinza",
    gub: 9,
    bgClass: "bg-slate-200 dark:bg-slate-700",
    borderClass: "border-slate-300 dark:border-slate-600",
    textClass: "text-slate-800 dark:text-slate-100",
    tipClass: "bg-slate-400"
  },
  "branca": {
    name: "Branca",
    gub: 9,
    bgClass: "bg-slate-100 dark:bg-slate-800",
    borderClass: "border-slate-300 dark:border-slate-600",
    textClass: "text-slate-800 dark:text-slate-100",
    tipClass: "bg-slate-300"
  },
  "amarela": {
    name: "Amarela",
    gub: 8,
    bgClass: "bg-amber-400 dark:bg-amber-500",
    borderClass: "border-amber-500/80",
    textClass: "text-amber-950 dark:text-amber-950 font-medium",
    tipClass: "bg-neutral-900"
  },
  "laranja": {
    name: "Laranja",
    gub: 7,
    bgClass: "bg-orange-500 dark:bg-orange-500",
    borderClass: "border-orange-600",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "verde": {
    name: "Verde",
    gub: 6,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-emerald-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "verde escura": {
    name: "Verde escura",
    gub: 5,
    bgClass: "bg-emerald-800 dark:bg-emerald-800",
    borderClass: "border-emerald-900",
    textClass: "text-white font-medium",
    tipClass: "bg-blue-600"
  },
  "azul": {
    name: "Azul",
    gub: 4,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-blue-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "azul escura": {
    name: "Azul escura",
    gub: 3,
    bgClass: "bg-indigo-900 dark:bg-indigo-900",
    borderClass: "border-indigo-950",
    textClass: "text-white font-medium",
    tipClass: "bg-red-600"
  },
  "vermelha": {
    name: "Vermelha",
    gub: 2,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-red-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "vermelha escura": {
    name: "Vermelha escura",
    gub: 1,
    bgClass: "bg-red-900 dark:bg-red-900",
    borderClass: "border-red-950",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "preta": {
    name: "Preta",
    bgClass: "bg-neutral-950 dark:bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400 font-bold",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  }
};

export function getBeltConfig(belt?: string | null, gub?: number | null): BeltVisualConfig {
  const rawBelt = belt ?? (gub ? beltForGub(gub as GubOption) : "") ?? "";
  const normalizedBelt = rawBelt
    .toLowerCase()
    .trim()
    .replace(/^faixa\s+/, "");

  if (normalizedBelt && BELT_CONFIGS[normalizedBelt]) {
    const config = BELT_CONFIGS[normalizedBelt];
    return {
      ...config,
      gub: gub ?? config.gub
    };
  }

  // Fallback for custom or unknown belt
  return {
    name: belt || (gub ? `${gub}º GUB` : "Não informada"),
    gub: gub ?? undefined,
    bgClass: "bg-muted text-muted-foreground",
    borderClass: "border-border",
    textClass: "text-muted-foreground",
    tipClass: "bg-muted-foreground/30"
  };
}

export function BeltBadge({
  belt,
  gub,
  size = "md",
  showGub = true,
  className
}: {
  belt?: string | null;
  gub?: number | null;
  size?: "sm" | "md" | "lg";
  showGub?: boolean;
  className?: string;
}) {
  const config = getBeltConfig(belt, gub);
  const resolvedGub = gub ?? config.gub;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-sans select-none transition-all shadow-xs",
        size === "sm" && "h-6 px-2 text-xs",
        size === "md" && "h-7 px-2.5 text-xs",
        size === "lg" && "h-8 px-3 text-sm",
        config.bgClass,
        config.borderClass,
        config.textClass,
        className
      )}
      aria-label={`Faixa ${config.name}${resolvedGub ? `, ${resolvedGub}º GUB` : ""}`}
    >
      {/* Miniatura visual de faixa com ponteira marcial */}
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex items-center overflow-hidden rounded-[2px] border border-black/20 shrink-0",
          size === "sm" && "h-3 w-6",
          size === "md" && "h-3.5 w-7",
          size === "lg" && "h-4 w-9",
          config.bgClass
        )}
      >
        {/* Costura central da faixa */}
        <span className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-black/10 dark:bg-white/15" />
        {/* Ponteira graduada preta (ou ponteira contrastante) */}
        <span
          className={cn(
            "absolute right-0 top-0 bottom-0 w-2 shrink-0 border-l border-black/20",
            config.tipClass ?? "bg-neutral-900"
          )}
        >
          {config.isBlackBelt && (
            <span className="absolute inset-y-0.5 right-0.5 w-[2px] bg-amber-400 rounded-full" />
          )}
        </span>
      </span>

      <span className="font-semibold tracking-tight">Faixa {config.name}</span>

      {showGub && resolvedGub ? (
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[10px] font-medium leading-none shrink-0",
            config.isBlackBelt
              ? "bg-amber-400/20 text-amber-300"
              : "bg-black/15 text-current dark:bg-white/20"
          )}
        >
          {resolvedGub}º GUB
        </span>
      ) : null}
    </div>
  );
}
