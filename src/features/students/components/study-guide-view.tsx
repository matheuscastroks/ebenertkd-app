"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { beltNameOf, findRank } from "@/features/academy/belt-rules";
import type { RankKey } from "@/features/academy/ranks";
import { BeltBadge } from "@/features/students/components/belt-badge";
import {
  KOREAN_COMMANDS,
  KOREAN_NUMBERS,
  TAEKWONDO_TENETS,
  type AnnotatedStudyModule,
} from "@/features/students/study-catalog";
import { CheckCircle2, RotateCcw, XCircle } from "@/components/ui/icons";

export function StudyGuideView({
  modules,
  currentRankKey,
}: {
  modules: AnnotatedStudyModule[];
  currentRankKey: RankKey;
}) {
  const ranks = useBeltRanks();
  const { formLabel } = useBeltLabels();
  const [selectedKey, setSelectedKey] = useState<RankKey>(currentRankKey);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const activeModule =
    modules.find((item) => item.rankKey === selectedKey) ??
    modules.find((item) => item.accessState === "current") ??
    [...modules].reverse().find((item) => item.accessState === "review") ??
    modules[0];
  const configuredForm = findRank(ranks, activeModule.rankKey)?.form_name;

  const quizQuestions = activeModule.quiz;
  const answeredCount = quizQuestions.filter((q) => answers[q.id] !== undefined).length;
  const correctCount = quizQuestions.filter((q) => answers[q.id] === q.correctIndex).length;

  return (
    <Tabs defaultValue="poomsae" className="space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
        <TabsTrigger value="poomsae" className="min-h-10">
          {formLabel} e técnicas
        </TabsTrigger>
        <TabsTrigger value="vocabulary" className="min-h-10">
          Vocabulário coreano
        </TabsTrigger>
        <TabsTrigger value="tenets" className="min-h-10">
          Princípios e etiqueta
        </TabsTrigger>
        <TabsTrigger value="quiz" className="min-h-10">
          Quiz de revisão
        </TabsTrigger>
      </TabsList>

      <TabsContent value="poomsae" className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Selecione uma faixa (sua faixa atual e as anteriores ficam liberadas para revisão):
          </p>
          <div className="flex flex-wrap gap-2">
            {modules.map((mod) => {
              const isSelected = mod.rankKey === activeModule.rankKey;
              return (
                <Button
                  key={mod.rankKey}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className="min-h-9"
                  onClick={() => setSelectedKey(mod.rankKey)}
                >
                  {beltNameOf(ranks, mod.rankKey)}
                  {mod.accessState === "current" ? " (Atual)" : ""}
                </Button>
              );
            })}
          </div>
        </div>

        <article className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <BeltBadge rankKey={activeModule.rankKey} size="md" />
                <StatusBadge
                  tone={
                    activeModule.accessState === "current"
                      ? "info"
                      : activeModule.accessState === "review"
                        ? "success"
                        : "neutral"
                  }
                >
                  {activeModule.accessState === "current"
                    ? "Faixa atual"
                    : activeModule.accessState === "review"
                      ? "Revisão liberada"
                      : "Próxima etapa"}
                </StatusBadge>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {activeModule.poomsae}
              </h2>
              {configuredForm && configuredForm !== activeModule.poomsae ? (
                <p className="text-sm text-muted-foreground">{formLabel} exigido na academia: {configuredForm}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {activeModule.trigram} ·{" "}
                <span className="tabular-nums">{activeModule.movements} movimentos</span>
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <p className="text-sm text-foreground">{activeModule.meaning}</p>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Pontos de atenção para o exame
                </h3>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                  {activeModule.focusPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Técnicas e chutes principais
                </h3>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                  {activeModule.keyTechniques.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>
      </TabsContent>

      <TabsContent value="vocabulary" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-base font-semibold">Comandos essenciais do dojang</h2>
            </div>
            <dl className="divide-y divide-border">
              {KOREAN_COMMANDS.map((item) => (
                <div
                  key={item.term}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <dt className="font-semibold text-foreground">{item.term}</dt>
                  <dd className="text-muted-foreground">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-base font-semibold">Contagem em coreano (1 a 10)</h2>
            </div>
            <ol className="divide-y divide-border">
              {KOREAN_NUMBERS.map((item) => (
                <li
                  key={item.number}
                  className="flex items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {item.number}
                  </span>
                  <span className="font-medium text-foreground">{item.term}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </TabsContent>

      <TabsContent value="tenets" className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Os 5 princípios do Taekwondo</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TAEKWONDO_TENETS.map((tenet) => (
              <div
                key={tenet.korean}
                className="space-y-1.5 rounded-xl border border-border bg-card p-4 shadow-xs"
              >
                <p className="text-xs font-medium text-muted-foreground">{tenet.korean}</p>
                <h3 className="text-base font-semibold text-foreground">{tenet.name}</h3>
                <p className="text-sm text-muted-foreground">{tenet.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-semibold">Etiqueta no dojang</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li>Cumprimente as bandeiras e o professor ao entrar e sair do tatame.</li>
            <li>Mantenha o Dobok limpo, a faixa bem amarrada e unhas aparadas para segurança.</li>
            <li>Retire anéis, pulseiras, brincos ou relógios antes do início do treino.</li>
            <li>Aproxime-se com atenção sempre que o professor der instruções técnicas.</li>
          </ul>
        </section>
      </TabsContent>

      <TabsContent value="quiz" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:px-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              Revisão teórica · Faixa {beltNameOf(ranks, activeModule.rankKey)}
            </h2>
            <p className="text-xs text-muted-foreground">
              Teste seus conhecimentos antes do exame. Esta prática é livre e não altera sua nota oficial.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={answeredCount === quizQuestions.length && correctCount === quizQuestions.length ? "success" : "info"}>
              {correctCount}/{quizQuestions.length} acerto{correctCount === 1 ? "" : "s"}
            </StatusBadge>
            {answeredCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => setAnswers({})}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Refazer
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {quizQuestions.map((q, qIdx) => {
            const chosen = answers[q.id];
            const isAnswered = chosen !== undefined;
            const isCorrect = chosen === q.correctIndex;
            return (
              <div
                key={q.id}
                className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs"
              >
                <p className="text-sm font-semibold text-foreground">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const selected = chosen === optIdx;
                    const correctOption = isAnswered && optIdx === q.correctIndex;
                    return (
                      <Button
                        key={opt}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        className="h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left text-sm"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: optIdx,
                          }))
                        }
                      >
                        <span className="flex-1">{opt}</span>
                        {correctOption ? (
                          <CheckCircle2 className="ml-2 size-4 shrink-0" aria-hidden="true" />
                        ) : selected && !isCorrect ? (
                          <XCircle className="ml-2 size-4 shrink-0" aria-hidden="true" />
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
                {isAnswered ? (
                  <p
                    className={
                      isCorrect
                        ? "rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success-foreground"
                        : "rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning-foreground"
                    }
                  >
                    {isCorrect ? "Correto! " : "Dica de revisão: "}
                    {q.explanation}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
