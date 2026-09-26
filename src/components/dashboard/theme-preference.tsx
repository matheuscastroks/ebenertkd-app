"use client";

import { useTheme } from "next-themes";
import { changeTheme } from "@/lib/theme-transition";
import { Switch } from "@/components/ui/switch";

export function ThemePreference() {
  const { resolvedTheme, setTheme } = useTheme();
  return <div className="space-y-3 rounded-xl border p-4"><label className="flex items-center justify-between gap-4"><span><span className="block font-medium">Modo escuro</span><span className="block text-sm text-muted-foreground">Use cores mais suaves à noite.</span></span><Switch checked={resolvedTheme === "dark"} onCheckedChange={(checked) => changeTheme(setTheme, checked ? "dark" : "light")} aria-label="Ativar modo escuro" /></label><button type="button" className="text-sm text-primary-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4" onClick={() => changeTheme(setTheme, "system")}>Seguir preferência do dispositivo</button></div>;
}
