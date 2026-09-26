import Link from "next/link";
import { Award, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BeltBadge, getBeltConfig } from "@/features/students/components/belt-badge";
import { GUB_BELT_OPTIONS, type GubOption, beltForGub } from "@/features/students/options";
import { cn } from "@/lib/utils";

// Progressão do Taekwondo CBTKD: do 9º GUB (iniciante) ao 1º GUB, culminando na Faixa Preta
const GRADUATION_STEPS = [
  ...GUB_BELT_OPTIONS.map((item) => ({
    gub: item.gub,
    belt: item.belt,
    label: `${item.belt} (${item.gub}º)`
  })),
  {
    gub: 0,
    belt: "Preta",
    label: "Faixa Preta (1º Dan)"
  }
];

export function GraduationCard({
  currentBelt,
  gub,
  startedAtTkd,
  attendanceRate
}: {
  currentBelt?: string | null;
  gub?: number | null;
  startedAtTkd?: string | null;
  attendanceRate?: number;
}) {
  const config = getBeltConfig(currentBelt, gub);
  const activeGub = gub ?? config.gub ?? 9;

  // No Taekwondo: 9º GUB é o primeiro degrau (índice 0), 1º GUB é o nono degrau (índice 8), Preta é o décimo (índice 9)
  const currentIndex = activeGub === 0 ? 9 : Math.max(0, 9 - activeGub);
  const totalSteps = GRADUATION_STEPS.length - 1; // 0 a 9
  const progressPercent = Math.min(100, Math.round((currentIndex / totalSteps) * 100));

  const nextStep = currentIndex < GRADUATION_STEPS.length - 1
    ? GRADUATION_STEPS[currentIndex + 1]
    : null;

  const formattedStartedAt = startedAtTkd
    ? new Date(startedAtTkd).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      })
    : null;

  return (
    <Card className="overflow-hidden border-primary/20 shadow-xs">
      <CardHeader className="bg-gradient-to-r from-muted/60 via-muted/30 to-background pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Award className="size-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Jornada de Graduação</CardTitle>
              <p className="text-xs text-muted-foreground">Progresso de faixas e GUBs no Taekwondo</p>
            </div>
          </div>
          <BeltBadge belt={currentBelt} gub={gub} size="md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Banner heróico da faixa atual */}
        <div
          className={cn(
            "relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 shadow-inner",
            config.bgClass,
            config.borderClass,
            config.textClass
          )}
        >
          {/* Efeito de textura marcial sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-black/10 dark:bg-white/10 pointer-events-none" />

          {/* Ponteira marcial à direita */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 border-l border-black/25 pointer-events-none hidden sm:block",
              config.tipClass ?? "bg-neutral-900"
            )}
          >
            {config.isBlackBelt && (
              <div className="absolute inset-y-1 right-2 w-1 bg-amber-400 rounded-full" />
            )}
          </div>

          <div className="relative z-10 space-y-0.5">
            <span className="text-[11px] uppercase tracking-widest opacity-80 font-mono">
              Graduação Atual
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Faixa {config.name}
            </h3>
            {activeGub > 0 ? (
              <p className="text-xs opacity-90">
                {activeGub}º GUB · Confederação Brasileira de Taekwondo
              </p>
            ) : (
              <p className="text-xs text-amber-300">Grau de Mestre / Faixa Preta (Dan)</p>
            )}
          </div>

          {formattedStartedAt && (
            <div className="relative z-10 sm:text-right text-xs opacity-85">
              <span>No Taekwondo desde</span>
              <p className="font-semibold capitalize">{formattedStartedAt}</p>
            </div>
          )}
        </div>

        {/* Trilha visual dos degraus de graduação */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              Evolução até a Faixa Preta
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {progressPercent}% concluído
            </span>
          </div>

          <Progress value={progressPercent} className="h-2" aria-label={`Evolução de graduação: ${progressPercent}%`} />

          {/* Mini pontos de faixas */}
          <div className="flex justify-between items-center pt-1 px-0.5">
            {GRADUATION_STEPS.map((step, idx) => {
              const stepConfig = getBeltConfig(step.belt, step.gub);
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div
                  key={step.label}
                  className="flex flex-col items-center group relative cursor-default"
                  title={step.label}
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full border transition-all",
                      stepConfig.bgClass,
                      isCurrent && "ring-2 ring-primary ring-offset-2 scale-125 z-10",
                      isPast && "opacity-90",
                      !isPast && !isCurrent && "opacity-35"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximo Objetivo e Requisitos */}
        {nextStep && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">Próximo objetivo:</p>
              <p className="font-medium text-foreground">
                Faixa {nextStep.belt} {nextStep.gub > 0 ? `(${nextStep.gub}º GUB)` : ""}
              </p>
            </div>
            {typeof attendanceRate === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Frequência mensal:</span>
                <Badge
                  variant={attendanceRate >= 75 ? "secondary" : "outline"}
                  className="text-[11px]"
                >
                  {attendanceRate}% {attendanceRate >= 75 ? "· Apto para exame" : "· Mínimo 75%"}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
