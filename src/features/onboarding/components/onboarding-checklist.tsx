"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingRole } from "../types";

export type ChecklistItem = {
  id: string;
  label: string;
  href: string;
  completed: boolean;
};

export function OnboardingChecklist({
  role,
  items,
}: {
  role: OnboardingRole;
  items: ChecklistItem[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  if (completedCount === items.length) {
    return null; // All done, don't clutter dashboard
  }

  const roleTitles: Record<OnboardingRole, string> = {
    admin: "Primeiros Passos da Gestão",
    adult_student: "Trilha Inicial do Praticante",
    minor_student: "Primeiros Passos no Dojang",
    guardian: "Primeiros Passos do Responsável",
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {roleTitles[role]}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {completedCount} de {items.length} etapas concluídas ({progressPercent}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden hidden sm:block">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? "Expandir checklist" : "Recolher checklist"}
            >
              {collapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-4 pt-1 border-t border-border/40">
          <div className="grid gap-2 sm:grid-cols-2 pt-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                  item.completed
                    ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-muted-foreground line-through"
                    : "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40 text-foreground font-medium"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
