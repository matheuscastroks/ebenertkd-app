"use client";

import { Check } from "lucide-react";
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
        <h2 className="text-xl font-semibold tracking-tight">
          Personalize o aplicativo
        </h2>
        <p className="text-sm text-muted-foreground">
          Perguntas rápidas para mostrar primeiro o que importa para você.
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
                  <p className="text-sm text-muted-foreground">
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
                        "flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 motion-reduce:transition-none",
                        "hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-card ring-1 ring-primary"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="space-y-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            "text-foreground"
                          )}
                        >
                          {option.label}
                        </p>
                        <p className="text-sm text-muted-foreground leading-normal">
                          {option.description}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 motion-reduce:transition-none mt-0.5",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
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
