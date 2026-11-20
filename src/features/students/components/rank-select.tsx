"use client";

import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicRank } from "@/features/academy/belt-rules";
import { selectableRanks } from "@/features/academy/belt-rules";
import { rankShortLabel } from "@/features/academy/ranks";
import { BeltMini } from "@/features/students/components/belt-badge";
import { cn } from "@/lib/utils";

/** Linha de uma graduação nas listas: miniatura da faixa, nome configurado e nível ("9º Gub"). */
export function RankOptionLabel({ rank, levelLabel }: { rank: PublicRank; levelLabel: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <BeltMini appearance={{ colorPrimary: rank.color_primary, colorSecondary: rank.color_secondary, colorStyle: rank.color_style }} size="sm" />
      <span className="truncate">{rank.display_name}</span>
      <span className="text-muted-foreground">· {rankShortLabel(rank.rank_key, levelLabel)}</span>
    </span>
  );
}

/**
 * Seletor único de Graduação (`rank_key`). Lista só as graduações habilitadas da academia, com o nome e a cor
 * configurados. `keep` preserva a graduação já gravada mesmo se ela for desativada depois.
 */
export function RankSelect({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  keep,
  options,
  placeholder = "Selecione a graduação",
  allLabel,
  required,
  disabled,
  className,
  leadingIcon,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  keep?: string | null;
  /** Lista explícita (p. ex. só os alvos possíveis de um exame). Sem ela, todas as habilitadas. */
  options?: readonly PublicRank[];
  placeholder?: string;
  /** Texto da opção "todas" (filtros). Ela tem o valor `all`. */
  allLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  leadingIcon?: React.ReactNode;
}) {
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const list = options ?? selectableRanks(ranks, keep ?? value ?? defaultValue);
  return (
    <Select name={name} value={value} defaultValue={defaultValue} onValueChange={onValueChange} required={required} disabled={disabled}>
      <SelectTrigger id={id} className={cn("h-10 w-full", className)} leadingIcon={leadingIcon}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allLabel ? <SelectItem value="all">{allLabel}</SelectItem> : null}
        {list.map((rank) => (
          <SelectItem key={rank.rank_key} value={rank.rank_key}>
            <RankOptionLabel rank={rank} levelLabel={levelLabel} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
