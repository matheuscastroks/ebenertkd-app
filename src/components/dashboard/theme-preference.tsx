"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { changeTheme } from "@/lib/theme-transition";
import { Monitor } from "lucide-react";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const themes = [
    { value: "light", label: "Claro", icon: SunIcon },
    { value: "dark", label: "Escuro", icon: MoonIcon },
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
          const isActive = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => changeTheme(setTheme, value)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition-[color,background-color,border-color,box-shadow] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none h-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring select-none",
                isActive
                  ? "border-primary bg-primary/10 text-primary-text shadow-xs ring-1 ring-primary"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", isActive ? "text-primary-text" : "text-muted-foreground")} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
