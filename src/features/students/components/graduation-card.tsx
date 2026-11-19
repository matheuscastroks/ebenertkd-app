"use client";

import { ChevronDown } from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { findRank, nextEnabledRank } from "@/features/academy/belt-rules";
import { BeltBadge } from "./belt-badge";

/**
 * Faixa atual em destaque, o próximo objetivo logo abaixo e os critérios do exame
 * recolhidos (progressive disclosure): quem já conhece não precisa reler.
 */
export function GraduationCard({ rankKey, startedAtTkd, attendanceRate, title = "Minha faixa" }: {
  rankKey?: string | null; startedAtTkd?: string | null; attendanceRate?: number; title?: string;
}) {
  const ranks = useBeltRanks();
  const { formLabel } = useBeltLabels();
  const current = findRank(ranks, rankKey);
  const next = nextEnabledRank(ranks, rankKey);
  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4 text-sm">
      <BeltBadge rankKey={rankKey} size="md" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {next ? <><dt className="text-muted-foreground">Próxima faixa</dt><dd className="font-medium">{next.display_name}</dd></> : null}
        {current?.form_name ? <><dt className="text-muted-foreground">{formLabel} atual</dt><dd className="font-medium">{current.form_name}</dd></> : null}
        {next && typeof attendanceRate === "number" ? <><dt className="text-muted-foreground">Frequência para o exame</dt><dd className="font-medium tabular-nums">{attendanceRate}%</dd></> : null}
      </dl>
      {startedAtTkd ? <p className="text-muted-foreground">Praticante desde {new Date(startedAtTkd).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</p> : null}
      <details className="group border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          Como funciona o exame
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <p className="pt-1 text-muted-foreground">O professor avalia formas, luta, quebramento e teoria. A data do próximo exame aparece em Exames quando for marcada.</p>
      </details>
    </CardContent>
  </Card>;
}
