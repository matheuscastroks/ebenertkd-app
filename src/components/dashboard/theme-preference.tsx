"use client";

import { useTheme } from "next-themes";
import { changeTheme } from "@/lib/theme-transition";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemePreference() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ] as const;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      <div>
        <p className="font-semibold text-sm text-foreground">Tema da interface</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Escolha entre visual claro, escuro ou acompanhamento automático do sistema.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {themes.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => changeTheme(setTheme, value)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition-all h-20 outline-none select-none",
                isActive
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
