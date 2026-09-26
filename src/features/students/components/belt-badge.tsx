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
  // 10º GUB: Branca (White)
  "branca": {
    name: "Branca",
    gub: 10,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-neutral-300 dark:border-neutral-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-neutral-900"
  },
  "white": {
    name: "Branca",
    gub: 10,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-neutral-300 dark:border-neutral-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-neutral-900"
  },
  // 9º GUB: Ponta Amarela (Yellow Tip)
  "ponta amarela": {
    name: "Ponta Amarela",
    gub: 9,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-amber-400"
  },
  "branca ponta amarela": {
    name: "Ponta Amarela",
    gub: 9,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-amber-400"
  },
  "yellow tip": {
    name: "Ponta Amarela",
    gub: 9,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-amber-400"
  },
  "cinza": {
    name: "Ponta Amarela",
    gub: 9,
    bgClass: "bg-neutral-100 dark:bg-neutral-200",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900 font-medium",
    tipClass: "bg-amber-400"
  },
  // 8º GUB: Amarela (Yellow)
  "amarela": {
    name: "Amarela",
    gub: 8,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-amber-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-neutral-900"
  },
  "yellow": {
    name: "Amarela",
    gub: 8,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-amber-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-neutral-900"
  },
  // 7º GUB: Ponta Verde (Green Tip)
  "ponta verde": {
    name: "Ponta Verde",
    gub: 7,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-emerald-600"
  },
  "amarela ponta verde": {
    name: "Ponta Verde",
    gub: 7,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-emerald-600"
  },
  "green tip": {
    name: "Ponta Verde",
    gub: 7,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-emerald-600"
  },
  "laranja": {
    name: "Ponta Verde",
    gub: 7,
    bgClass: "bg-amber-400 dark:bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950 font-medium",
    tipClass: "bg-emerald-600"
  },
  // 6º GUB: Verde (Green)
  "verde": {
    name: "Verde",
    gub: 6,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-emerald-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "green": {
    name: "Verde",
    gub: 6,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-emerald-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  // 5º GUB: Ponta Azul (Blue Tip)
  "ponta azul": {
    name: "Ponta Azul",
    gub: 5,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white font-medium",
    tipClass: "bg-blue-600"
  },
  "verde ponta azul": {
    name: "Ponta Azul",
    gub: 5,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white font-medium",
    tipClass: "bg-blue-600"
  },
  "blue tip": {
    name: "Ponta Azul",
    gub: 5,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white font-medium",
    tipClass: "bg-blue-600"
  },
  "verde escura": {
    name: "Ponta Azul",
    gub: 5,
    bgClass: "bg-emerald-600 dark:bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white font-medium",
    tipClass: "bg-blue-600"
  },
  // 4º GUB: Azul (Blue)
  "azul": {
    name: "Azul",
    gub: 4,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-blue-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "blue": {
    name: "Azul",
    gub: 4,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-blue-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  // 3º GUB: Ponta Vermelha (Red Tip)
  "ponta vermelha": {
    name: "Ponta Vermelha",
    gub: 3,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white font-medium",
    tipClass: "bg-red-600"
  },
  "azul ponta vermelha": {
    name: "Ponta Vermelha",
    gub: 3,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white font-medium",
    tipClass: "bg-red-600"
  },
  "red tip": {
    name: "Ponta Vermelha",
    gub: 3,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white font-medium",
    tipClass: "bg-red-600"
  },
  "azul escura": {
    name: "Ponta Vermelha",
    gub: 3,
    bgClass: "bg-blue-600 dark:bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white font-medium",
    tipClass: "bg-red-600"
  },
  // 2º GUB: Vermelha (Red)
  "vermelha": {
    name: "Vermelha",
    gub: 2,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-red-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  "red": {
    name: "Vermelha",
    gub: 2,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-red-700",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-900"
  },
  // 1º GUB: Ponta Preta (Black Tip)
  "ponta preta": {
    name: "Ponta Preta",
    gub: 1,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-950"
  },
  "vermelha ponta preta": {
    name: "Ponta Preta",
    gub: 1,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-950"
  },
  "black tip": {
    name: "Ponta Preta",
    gub: 1,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-950"
  },
  "vermelha escura": {
    name: "Ponta Preta",
    gub: 1,
    bgClass: "bg-red-600 dark:bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white font-medium",
    tipClass: "bg-neutral-950"
  },
  // Dan: Faixa Preta (Black Belt)
  "preta": {
    name: "Preta",
    gub: 0,
    bgClass: "bg-neutral-950 dark:bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400 font-bold",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 1º dan": {
    name: "Preta 1º Dan",
    gub: 0,
    bgClass: "bg-neutral-950 dark:bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400 font-bold",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 2º dan": {
    name: "Preta 2º Dan",
    gub: 0,
    bgClass: "bg-neutral-950 dark:bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400 font-bold",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 3º dan": {
    name: "Preta 3º Dan",
    gub: 0,
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
