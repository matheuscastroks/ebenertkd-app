"use client";

import { useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BeltBadge, getBeltConfig } from "@/features/students/components/belt-badge";
import { GUB_BELT_OPTIONS, DAN_BELT_OPTIONS, poomsaeForGub } from "@/features/students/options";
import { cn } from "@/lib/utils";

// Progressão de faixas oficial Ebener TKD: do 10º GUB (Branca) ao 1º GUB, culminando na Faixa Preta
const GRADUATION_STEPS = [
  ...GUB_BELT_OPTIONS.map((item) => ({
    gub: item.gub,
    belt: item.belt,
    label: `${item.belt} (${item.gub}º GUB)`
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
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const config = getBeltConfig(currentBelt, gub);
  const activeGub = gub ?? config.gub ?? 10;

  // No Taekwondo Ebener TKD: 10º GUB (Branca) é índice 0, 1º GUB (Ponta Preta) é índice 9, Preta é índice 10
  const currentIndex = activeGub === 0 ? 10 : Math.max(0, 10 - activeGub);
  const totalSteps = GRADUATION_STEPS.length - 1; // 0 a 10
  const progressPercent = Math.min(100, Math.round((currentIndex / totalSteps) * 100));

  const nextStep = currentIndex < GRADUATION_STEPS.length - 1
    ? GRADUATION_STEPS[currentIndex + 1]
    : null;

  const currentPoomsae = activeGub > 0 ? poomsaeForGub(activeGub) : "Koryo";
  const nextPoomsae = nextStep?.gub && nextStep.gub > 0 ? poomsaeForGub(nextStep.gub) : "Koryo";

  const formattedStartedAt = startedAtTkd
    ? new Date(startedAtTkd).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      })
    : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/40 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 depth-recessed">
              <Award className="size-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Jornada de Graduação</CardTitle>
              <p className="text-xs text-muted-foreground">Progresso de faixas e GUBs na Ebener TKD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCriteriaOpen} onOpenChange={setIsCriteriaOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Como funciona o exame?</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Award className="size-5 text-primary" aria-hidden="true" />
                    Como Funciona o Exame de Faixa
                  </DialogTitle>
                  <DialogDescription>
                    Critérios de avaliação, pilares técnicos e dicas para a evolução no Taekwondo.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2 text-sm text-foreground">
                  {/* Pilares do Exame */}
                  <div>
                    <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-2">
                      4 Pilares Avaliados no Exame
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="rounded-lg border bg-card p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                          <Target className="size-3.5" />
                          <span>Poomsae (Formas)</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Sequência solo de movimentos avaliada em precisão técnica, potência, postura e ritmo marcial.
                        </p>
                      </div>

                      <div className="rounded-lg border bg-card p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                          <Swords className="size-3.5" />
                          <span>Kyorugi (Luta)</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Combate controlado com parceiro, demonstrando aplicação prática, esquiva, chutes e controle emocional.
                        </p>
                      </div>

                      <div className="rounded-lg border bg-card p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                          <Zap className="size-3.5" />
                          <span>Gyeokpa (Quebramento)</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Quebramento de tábuas demonstrando foco mental, alinhamento técnico e potência de impacto.
                        </p>
                      </div>

                      <div className="rounded-lg border bg-card p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                          <BookOpen className="size-3.5" />
                          <span>Teoria & Atitude</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Vocabulário técnico em coreano, os 5 Princípios marciais, disciplina e respeito no Dojang.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dicas para aprovação */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <ShieldCheck className="size-4" />
                      Dicas para Obter a Próxima Faixa
                    </div>
                    <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1 list-disc list-inside">
                      <li>Treine com consistência: no mínimo 2 a 3 vezes por semana.</li>
                      <li>Pratique seu Poomsae regularmente em casa e nas aulas.</li>
                      <li>Chegue com pontualidade no dia da avaliação e vista o Dobok limpo e completo.</li>
                      <li>Demonstre espírito indomável (Baekjulboolgool) e dedicação total.</li>
                    </ul>
                  </div>

                  {/* Tempo até a Faixa Preta */}
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Clock className="size-4 text-primary" />
                      Tempo Médio até a Faixa Preta (1º Dan)
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Em média, são necessários de <strong>3 a 5 anos</strong> de treinamento dedicado e consistente para alcançar a Faixa Preta. As avaliações de GUB ocorrem a cada 3 a 4 meses, respeitando o tempo de maturação técnica e comportamental de cada praticante.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Alunos menores de 15 anos recebem a graduação <strong>Poom (faixa preta júnior)</strong>, conforme os regulamentos internacionais da Kukkiwon.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <BeltBadge belt={currentBelt} gub={gub} size="md" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Banner elegante da graduação atual */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/10 dark:border-white/5 bg-neutral-900 text-white dark:bg-neutral-950 p-4 depth-floating">
          {/* Faixa marcial visual horizontal decorativa */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-primary/40 pointer-events-none" />

          {/* Ponteira marcial à direita */}
          <div className="absolute right-0 top-0 bottom-0 w-8 border-l border-white/10 pointer-events-none hidden sm:flex items-center justify-center">
            <span
              className={cn(
                "h-full w-2.5",
                config.tipColor ?? "bg-neutral-800"
              )}
            />
          </div>

          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-mono">
                Graduação Atual
              </span>
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300 font-medium">
                {activeGub > 0 ? `${activeGub}º GUB` : "Dan"}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Faixa {config.name}</span>
            </h3>
            {activeGub > 0 ? (
              <p className="text-xs text-neutral-400">
                <span>{activeGub}º GUB · Confederação Brasileira de Taekwondo</span>
                <span className="text-neutral-500"> · </span>
                <span>Forma: </span>
                <span className="text-neutral-200 font-medium">{currentPoomsae}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-300">
                <span>Faixa Preta (1º Dan)</span>
                <span className="text-amber-500/50"> · </span>
                <span>Forma: </span>
                <span className="text-neutral-200 font-medium">{currentPoomsae}</span>
              </p>
            )}
          </div>

          {formattedStartedAt && (
            <div className="relative z-10 sm:text-right text-xs text-neutral-400 sm:pr-8">
              <span>Praticante desde</span>
              <p className="font-semibold text-neutral-200 capitalize">{formattedStartedAt}</p>
            </div>
          )}
        </div>

        {/* Trilha visual dos degraus de graduação */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              Evolução até a Faixa Preta (1º Dan)
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
                      "size-2.5 rounded-full border border-black/20 transition-all",
                      stepConfig.beltColor,
                      isCurrent && "ring-2 ring-primary ring-offset-2 scale-125 z-10",
                      isPast && "opacity-90",
                      !isPast && !isCurrent && "opacity-30"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximo Objetivo e Requisitos */}
        {nextStep && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/50 bg-surface-recessed/60 p-3.5 text-xs depth-recessed">
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Próximo objetivo:</p>
              <p className="font-medium text-foreground">
                Faixa {nextStep.belt} {nextStep.gub > 0 ? `(${nextStep.gub}º GUB)` : "(1º Dan)"} · <span className="text-muted-foreground font-normal">Poomsae: {nextPoomsae}</span>
              </p>
            </div>
            {typeof attendanceRate === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Frequência:</span>
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
