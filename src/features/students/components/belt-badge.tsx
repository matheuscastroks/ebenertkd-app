import { cn } from "@/lib/utils";
import { type BeltOption, type GubOption, beltForGub } from "@/features/students/options";

export type BeltVisualConfig = {
  name: string;
  gub?: number;
  beltColor: string;
  tipColor: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  tipClass: string;
  isBlackBelt?: boolean;
};

// Ebener TKD Belt Progression: 10º GUB (Branca) -> 1º GUB (Ponta Preta) -> Dan (Preta)
const BELT_CONFIGS: Record<string, BeltVisualConfig> = {
  // 10º GUB: Branca (White)
  "branca": {
    name: "Branca",
    gub: 10,
    beltColor: "bg-white",
    tipColor: "bg-neutral-900",
    bgClass: "bg-white",
    borderClass: "border-neutral-300",
    textClass: "text-neutral-900",
    tipClass: "bg-neutral-900"
  },
  "white": {
    name: "Branca",
    gub: 10,
    beltColor: "bg-white",
    tipColor: "bg-neutral-900",
    bgClass: "bg-white",
    borderClass: "border-neutral-300",
    textClass: "text-neutral-900",
    tipClass: "bg-neutral-900"
  },
  // 9º GUB: Ponta Amarela (Yellow Tip)
  "ponta amarela": {
    name: "Ponta Amarela",
    gub: 9,
    beltColor: "bg-white",
    tipColor: "bg-amber-400",
    bgClass: "bg-white",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900",
    tipClass: "bg-amber-400"
  },
  "branca ponta amarela": {
    name: "Ponta Amarela",
    gub: 9,
    beltColor: "bg-white",
    tipColor: "bg-amber-400",
    bgClass: "bg-white",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900",
    tipClass: "bg-amber-400"
  },
  "yellow tip": {
    name: "Ponta Amarela",
    gub: 9,
    beltColor: "bg-white",
    tipColor: "bg-amber-400",
    bgClass: "bg-white",
    borderClass: "border-amber-400",
    textClass: "text-neutral-900",
    tipClass: "bg-amber-400"
  },
  // 8º GUB: Amarela (Yellow)
  "amarela": {
    name: "Amarela",
    gub: 8,
    beltColor: "bg-amber-400",
    tipColor: "bg-neutral-900",
    bgClass: "bg-amber-400",
    borderClass: "border-amber-500",
    textClass: "text-amber-950",
    tipClass: "bg-neutral-900"
  },
  "yellow": {
    name: "Amarela",
    gub: 8,
    beltColor: "bg-amber-400",
    tipColor: "bg-neutral-900",
    bgClass: "bg-amber-400",
    borderClass: "border-amber-500",
    textClass: "text-amber-950",
    tipClass: "bg-neutral-900"
  },
  // 7º GUB: Ponta Verde (Green Tip)
  "ponta verde": {
    name: "Ponta Verde",
    gub: 7,
    beltColor: "bg-amber-400",
    tipColor: "bg-emerald-600",
    bgClass: "bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950",
    tipClass: "bg-emerald-600"
  },
  "amarela ponta verde": {
    name: "Ponta Verde",
    gub: 7,
    beltColor: "bg-amber-400",
    tipColor: "bg-emerald-600",
    bgClass: "bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950",
    tipClass: "bg-emerald-600"
  },
  "green tip": {
    name: "Ponta Verde",
    gub: 7,
    beltColor: "bg-amber-400",
    tipColor: "bg-emerald-600",
    bgClass: "bg-amber-400",
    borderClass: "border-emerald-500",
    textClass: "text-amber-950",
    tipClass: "bg-emerald-600"
  },
  // 6º GUB: Verde (Green)
  "verde": {
    name: "Verde",
    gub: 6,
    beltColor: "bg-emerald-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  "green": {
    name: "Verde",
    gub: 6,
    beltColor: "bg-emerald-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  // 5º GUB: Ponta Azul (Blue Tip)
  "ponta azul": {
    name: "Ponta Azul",
    gub: 5,
    beltColor: "bg-emerald-600",
    tipColor: "bg-blue-600",
    bgClass: "bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white",
    tipClass: "bg-blue-600"
  },
  "verde ponta azul": {
    name: "Ponta Azul",
    gub: 5,
    beltColor: "bg-emerald-600",
    tipColor: "bg-blue-600",
    bgClass: "bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white",
    tipClass: "bg-blue-600"
  },
  "blue tip": {
    name: "Ponta Azul",
    gub: 5,
    beltColor: "bg-emerald-600",
    tipColor: "bg-blue-600",
    bgClass: "bg-emerald-600",
    borderClass: "border-blue-500",
    textClass: "text-white",
    tipClass: "bg-blue-600"
  },
  // 4º GUB: Azul (Blue)
  "azul": {
    name: "Azul",
    gub: 4,
    beltColor: "bg-blue-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-blue-600",
    borderClass: "border-blue-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  "blue": {
    name: "Azul",
    gub: 4,
    beltColor: "bg-blue-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-blue-600",
    borderClass: "border-blue-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  // 3º GUB: Ponta Vermelha (Red Tip)
  "ponta vermelha": {
    name: "Ponta Vermelha",
    gub: 3,
    beltColor: "bg-blue-600",
    tipColor: "bg-red-600",
    bgClass: "bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white",
    tipClass: "bg-red-600"
  },
  "azul ponta vermelha": {
    name: "Ponta Vermelha",
    gub: 3,
    beltColor: "bg-blue-600",
    tipColor: "bg-red-600",
    bgClass: "bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white",
    tipClass: "bg-red-600"
  },
  "red tip": {
    name: "Ponta Vermelha",
    gub: 3,
    beltColor: "bg-blue-600",
    tipColor: "bg-red-600",
    bgClass: "bg-blue-600",
    borderClass: "border-red-500",
    textClass: "text-white",
    tipClass: "bg-red-600"
  },
  // 2º GUB: Vermelha (Red)
  "vermelha": {
    name: "Vermelha",
    gub: 2,
    beltColor: "bg-red-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-red-600",
    borderClass: "border-red-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  "red": {
    name: "Vermelha",
    gub: 2,
    beltColor: "bg-red-600",
    tipColor: "bg-neutral-900",
    bgClass: "bg-red-600",
    borderClass: "border-red-700",
    textClass: "text-white",
    tipClass: "bg-neutral-900"
  },
  // 1º GUB: Ponta Preta (Black Tip)
  "ponta preta": {
    name: "Ponta Preta",
    gub: 1,
    beltColor: "bg-red-600",
    tipColor: "bg-neutral-950",
    bgClass: "bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white",
    tipClass: "bg-neutral-950"
  },
  "vermelha ponta preta": {
    name: "Ponta Preta",
    gub: 1,
    beltColor: "bg-red-600",
    tipColor: "bg-neutral-950",
    bgClass: "bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white",
    tipClass: "bg-neutral-950"
  },
  "black tip": {
    name: "Ponta Preta",
    gub: 1,
    beltColor: "bg-red-600",
    tipColor: "bg-neutral-950",
    bgClass: "bg-red-600",
    borderClass: "border-neutral-900",
    textClass: "text-white",
    tipClass: "bg-neutral-950"
  },
  // Dan: Faixa Preta (Black Belt)
  "preta": {
    name: "Preta",
    gub: 0,
    beltColor: "bg-neutral-950",
    tipColor: "bg-amber-400",
    bgClass: "bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 1º dan": {
    name: "Preta 1º Dan",
    gub: 0,
    beltColor: "bg-neutral-950",
    tipColor: "bg-amber-400",
    bgClass: "bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 2º dan": {
    name: "Preta 2º Dan",
    gub: 0,
    beltColor: "bg-neutral-950",
    tipColor: "bg-amber-400",
    bgClass: "bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400",
    tipClass: "bg-amber-400",
    isBlackBelt: true
  },
  "preta 3º dan": {
    name: "Preta 3º Dan",
    gub: 0,
    beltColor: "bg-neutral-950",
    tipColor: "bg-amber-400",
    bgClass: "bg-neutral-950",
    borderClass: "border-neutral-800",
    textClass: "text-amber-400",
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
    beltColor: "bg-muted",
    tipColor: "bg-muted-foreground/40",
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
        "inline-flex items-center gap-1.5 rounded-md border border-neutral-200/90 dark:border-neutral-800 bg-neutral-100/90 dark:bg-neutral-900/70 text-neutral-800 dark:text-neutral-200 font-sans select-none transition-all shadow-xs",
        size === "sm" && "h-6 px-2 text-xs",
        size === "md" && "h-7 px-2.5 text-xs",
        size === "lg" && "h-8 px-3 text-sm",
        className
      )}
      aria-label={`Faixa ${config.name}${resolvedGub ? `, ${resolvedGub}º GUB` : ""}`}
    >
      {/* Miniatura visual de faixa com ponteira marcial isolada */}
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex items-center overflow-hidden rounded-[2px] border border-black/25 shrink-0 shadow-xs",
          size === "sm" && "h-3 w-6",
          size === "md" && "h-3.5 w-7",
          size === "lg" && "h-4 w-9",
          config.beltColor
        )}
      >
        {/* Costura central horizontal */}
        <span className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-black/15 dark:bg-white/20" />
        {/* Ponteira marcial */}
        <span
          className={cn(
            "absolute right-0 top-0 bottom-0 w-2 shrink-0 border-l border-black/20",
            config.tipColor ?? "bg-neutral-900"
          )}
        >
          {config.isBlackBelt && (
            <span className="absolute inset-y-0.5 right-0.5 w-[2px] bg-amber-400 rounded-full" />
          )}
        </span>
      </span>

      <span className="font-semibold tracking-tight">Faixa {config.name}</span>

      {showGub && resolvedGub != null && (
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[10px] font-medium leading-none shrink-0",
            config.isBlackBelt
              ? "bg-amber-400/20 text-amber-700 dark:text-amber-300 font-semibold"
              : "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          )}
        >
          {resolvedGub > 0 ? `${resolvedGub}º GUB` : "Dan"}
        </span>
      )}
    </div>
  );
}
