"use client";

import { Award, CheckCircle2, Sparkles, Shield, Trophy } from "lucide-react";
import type { RoleOnboardingConfig } from "../types";

export function OnboardingWelcomeStep({
  config,
  userName,
}: {
  config: RoleOnboardingConfig;
  userName: string;
}) {
  return (
    <div className="space-y-6 py-2">
      {/* Header com badge & saudação */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Sparkles className="size-3.5" />
          <span>{config.welcomeHighlight}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Olá, {userName.split(" ")[0]}! 👋
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {config.welcomeSubtitle}
        </p>
      </div>

      {/* Momento de Valor (Aha! Moment Card) */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Trophy className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-primary">Seu Momento de Valor</p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {config.ahaMomentDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Benefícios Chave (3 Pilares) */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          O que você pode fazer no app:
        </p>

        <div className="grid gap-2.5">
          {config.benefitBullets.map((bullet, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card hover:border-border"
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-foreground">{bullet.title}</p>
                <p className="text-muted-foreground">{bullet.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
