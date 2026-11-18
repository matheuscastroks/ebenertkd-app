"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                {roleTitles[role]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {completedCount} de {items.length} etapas concluídas ({progressPercent}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Progress value={progressPercent} aria-valuenow={progressPercent} aria-label="Etapas concluídas" className="hidden w-24 sm:block" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
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
        <CardContent className="p-4 pt-1 border-t border-border">
          <div className="grid gap-2 sm:grid-cols-2 pt-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors",
                  item.completed
                    ? "border-border bg-success-soft text-muted-foreground line-through"
                    : "border-border bg-card hover:bg-muted text-foreground font-medium"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="size-4 text-success-foreground shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
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
