import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge, getBeltConfig } from "./belt-badge";
import { beltForGub, poomsaeForGub } from "@/features/students/options";

/**
 * Faixa atual em destaque, o próximo objetivo logo abaixo e os critérios do exame
 * recolhidos (progressive disclosure): quem já conhece não precisa reler.
 */
export function GraduationCard({ currentBelt, gub, startedAtTkd, attendanceRate, title = "Minha faixa" }: {
  currentBelt?: string | null; gub?: number | null; startedAtTkd?: string | null; attendanceRate?: number; title?: string;
}) {
  const config = getBeltConfig(currentBelt, gub);
  const activeGub = gub ?? config.gub ?? 10;
  const nextBelt = activeGub > 1 ? beltForGub(activeGub - 1) : "Preta";
  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4 text-sm">
      <BeltBadge belt={currentBelt} gub={gub} size="md" />
      {activeGub > 0 ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Próxima faixa</dt><dd className="font-medium">{nextBelt}</dd>
        <dt className="text-muted-foreground">Poomsae atual</dt><dd className="font-medium">{poomsaeForGub(activeGub)}</dd>
        {typeof attendanceRate === "number" ? <><dt className="text-muted-foreground">Frequência para o exame</dt><dd className="font-medium tabular-nums">{attendanceRate}%</dd></> : null}
      </dl> : <p className="font-medium">Graduação Dan · {currentBelt || "Faixa Preta"}</p>}
      {startedAtTkd ? <p className="text-muted-foreground">Praticante desde {new Date(startedAtTkd).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</p> : null}
      <details className="group border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          Como funciona o exame
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <p className="pt-1 text-muted-foreground">O professor avalia formas, luta, quebramento e teoria. A data do próximo exame aparece em Exames quando for marcada.</p>
      </details>
    </CardContent>
  </Card>;
}
