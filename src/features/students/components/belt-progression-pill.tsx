"use client";

import { ArrowRight } from "@/components/ui/icons";
import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { beltNameOf } from "@/features/academy/belt-rules";
import { rankShortLabel, isRankKey } from "@/features/academy/ranks";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { cn } from "@/lib/utils";

export type BeltProgressionPillProps = {
  /** Graduação de origem. Com ela, mostra "Atual → Alvo". */
  fromRankKey?: string | null;
  /** Graduação de destino (ou a única, quando não há origem). */
  toRankKey?: string | null;
  /** Nomes gravados no histórico (snapshot da época). Sem eles, valem os nomes configurados hoje. */
  fromName?: string | null;
  toName?: string | null;
  size?: "sm" | "md" | "lg";
  showRank?: boolean;
  className?: string;
};

export function BeltProgressionPill({ fromRankKey, toRankKey, fromName, toName, size = "md", showRank = true, className }: BeltProgressionPillProps) {
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const badgeSize = size === "lg" ? "md" : "sm";

  if (!fromRankKey) {
    return <BeltBadge rankKey={toRankKey} nameOverride={toName} size={size} showRank={showRank} className={className} />;
  }

  const label = (key: string | null | undefined, name?: string | null) =>
    `${name ?? beltNameOf(ranks, key)}${isRankKey(key) ? `, ${rankShortLabel(key, levelLabel)}` : ""}`;

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg bg-background px-2 py-1",
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        className
      )}
      aria-label={`Progressão de faixa: ${label(fromRankKey, fromName)} para ${label(toRankKey, toName)}`}
    >
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Atual:</span>
        <BeltBadge rankKey={fromRankKey} nameOverride={fromName} size={badgeSize} showRank={showRank} />
      </div>
      <ArrowRight className={cn("shrink-0 text-muted-foreground", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" />
      <div className="flex items-center gap-1">
        <span className="hidden text-xs font-medium text-primary-text sm:inline">Alvo:</span>
        <BeltBadge rankKey={toRankKey} nameOverride={toName} size={badgeSize} showRank={showRank} className="bg-primary/15" />
      </div>
    </div>
  );
}
