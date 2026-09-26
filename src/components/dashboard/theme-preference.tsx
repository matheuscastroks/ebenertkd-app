"use client";

import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  return <div className="space-y-3 rounded-xl border p-4"><label className="flex items-center justify-between gap-4"><span><span className="block font-medium">Modo escuro</span><span className="block text-sm text-muted-foreground">Use cores mais suaves à noite.</span></span><Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Ativar modo escuro" /></label><button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => setTheme("system")}>Seguir preferência do dispositivo</button></div>;
}
