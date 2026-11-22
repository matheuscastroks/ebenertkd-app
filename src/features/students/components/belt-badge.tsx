"use client";

import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { beltBackground, type BeltAppearance } from "@/features/academy/belt-colors";
import { appearanceOf } from "@/features/academy/belt-rules";
import { isRankKey, rankShortLabel } from "@/features/academy/ranks";
import { cn } from "@/lib/utils";

type BeltSize = "sm" | "md" | "lg";

const MINI_SIZE: Record<BeltSize, string> = {
  sm: "h-3 w-6",
  md: "h-3.5 w-7",
  lg: "h-4 w-9"
};

/** Extrai o grau de Dan (`1`..`9`) de uma `rank_key` como `"dan-2"`. */
export function danDegreeOf(rankKey?: string | null): number | null {
  if (!rankKey) return null;
  const match = /^dan-(\d+)$/.exec(rankKey);
  return match ? Number(match[1]) : null;
}

/** Miniatura da faixa desenhada a partir da configuração (lisa, ponta, listra ou meia). Cores em linha: vêm do banco. */
export function BeltMini({
  appearance,
  danDegree,
  size = "md",
  className
}: {
  appearance: Omit<BeltAppearance, "name">;
  danDegree?: number | null;
  size?: BeltSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-sm", MINI_SIZE[size], className)}
      style={{ background: beltBackground(appearance, danDegree) }}
    />
  );
}

/** Badge puro: recebe a aparência pronta (usado na prévia do editor). */
export function BeltBadgeView({
  appearance,
  rankLabel,
  danDegree,
  size = "md",
  showName = false,
  className
}: {
  appearance: BeltAppearance;
  /** "9º Gub": mostrado ao lado da faixa. Omitido, mostra o nome. */
  rankLabel?: string | null;
  danDegree?: number | null;
  size?: BeltSize;
  showName?: boolean;
  className?: string;
}) {
  const showCompactRank = !showName && Boolean(rankLabel);
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-muted font-sans text-foreground select-none",
        size === "sm" && "h-6 px-2 text-xs",
        size === "md" && "h-7 px-2.5 text-xs",
        size === "lg" && "h-8 px-3 text-sm",
        className
      )}
      aria-label={`Faixa ${appearance.name}${rankLabel ? `, ${rankLabel}` : ""}`}
      title={`Faixa ${appearance.name}${rankLabel ? ` · ${rankLabel}` : ""}`}
    >
      <BeltMini appearance={appearance} danDegree={danDegree} size={size} />
      {showCompactRank ? (
        <span className="font-semibold tracking-tight whitespace-nowrap">{rankLabel}</span>
      ) : (
        <>
          <span className="font-semibold tracking-tight whitespace-nowrap">{appearance.name}</span>
          {rankLabel ? (
            <span className="shrink-0 rounded bg-background px-1 py-0.5 text-xs font-medium leading-none text-muted-foreground">{rankLabel}</span>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Faixa de uma graduação (`rank_key`), com nome e cor sempre vindos da configuração da academia.
 * Sem graduação informada mostra "Não informada".
 */
export function BeltBadge({
  rankKey,
  nameOverride,
  size = "md",
  showRank = true,
  showName,
  className
}: {
  rankKey?: string | null;
  /** Nome da faixa no momento de um registro histórico (snapshot). A cor continua a da configuração atual. */
  nameOverride?: string | null;
  size?: BeltSize;
  showRank?: boolean;
  showName?: boolean;
  className?: string;
}) {
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const configured = appearanceOf(ranks, rankKey);
  const appearance = configured && nameOverride ? { ...configured, name: nameOverride } : configured;
  if (!appearance || !isRankKey(rankKey)) {
    return (
      <div
        className={cn(
          "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-md bg-muted px-2.5 text-xs font-semibold text-muted-foreground",
          className
        )}
      >
        Não informada
      </div>
    );
  }
  const danDegree = danDegreeOf(rankKey);
  const resolvedShowName = showName ?? !showRank;
  return (
    <BeltBadgeView
      appearance={appearance}
      danDegree={danDegree}
      rankLabel={showRank ? rankShortLabel(rankKey, levelLabel) : null}
      size={size}
      showName={resolvedShowName}
      className={className}
    />
  );
}
