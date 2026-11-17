import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge, getBeltConfig } from "./belt-badge";
import { beltForGub, poomsaeForGub } from "@/features/students/options";

export function GraduationCard({ currentBelt, gub, startedAtTkd, attendanceRate }: {
  currentBelt?: string | null; gub?: number | null; startedAtTkd?: string | null; attendanceRate?: number;
}) {
  const config = getBeltConfig(currentBelt, gub);
  const activeGub = gub ?? config.gub ?? 10;
  const nextBelt = activeGub > 1 ? beltForGub(activeGub - 1) : "Preta";
  return <Card>
    <CardHeader><CardTitle>Minha faixa</CardTitle></CardHeader>
    <CardContent className="space-y-3 text-sm">
      <BeltBadge belt={currentBelt} gub={gub} size="md" />
      {activeGub > 0 ? <>
        <p className="font-medium">Próximo: Faixa {nextBelt}</p>
        <p className="text-muted-foreground">Poomsae atual: {poomsaeForGub(activeGub)}</p>
      </> : <p className="font-medium">Graduação Dan · {currentBelt || "Faixa Preta"}</p>}
      {typeof attendanceRate === "number" ? <p>Frequência para o exame: {attendanceRate}%</p> : null}
      <p className="text-muted-foreground">O professor avalia formas, luta, quebramento e teoria. Consulte os critérios e a data do próximo exame com a academia.</p>
      {startedAtTkd ? <p className="text-muted-foreground">Praticante desde {new Date(startedAtTkd).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</p> : null}
    </CardContent>
  </Card>;
}
