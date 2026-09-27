"use client";

import { Check, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingQuestion, OnboardingPreferences } from "../types";

export function OnboardingPreferencesStep({
  questions,
  preferences,
  onChange,
}: {
  questions: OnboardingQuestion[];
  preferences: OnboardingPreferences;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Personalize sua Experiência
        </h2>
        <p className="text-sm text-muted-foreground">
          Responda a estas perguntas rápidas para ajustarmos o aplicativo exatamente ao que você precisa.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const selectedValue = preferences[question.id] as string | undefined;

          return (
            <div key={question.id} className="space-y-3">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-foreground">
                  {question.title}
                </label>
                {question.description && (
                  <p className="text-xs text-muted-foreground">
                    {question.description}
                  </p>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-1">
                {question.options.map((option) => {
                  const isSelected = selectedValue === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onChange(question.id, option.id)}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all",
                        "hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                          : "border-border/70 bg-card text-muted-foreground"
                      )}
                    >
                      <div className="space-y-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-foreground font-semibold" : "text-foreground"
                          )}
                        >
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-normal">
                          {option.description}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all mt-0.5",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-muted/20"
                        )}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
