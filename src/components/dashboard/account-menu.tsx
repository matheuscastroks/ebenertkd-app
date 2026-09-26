"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { changeTheme } from "@/lib/theme-transition";
import { Bell, ChevronUp, Moon, Settings, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { LogoutButton } from "@/components/dashboard/logout-button";

export function AccountMenu({ name, badge }: { name: string; badge: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return <Popover>
    <PopoverTrigger className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 text-left outline-none transition hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label={`Abrir menu de ${name}`}>
      <Avatar size="sm"><AvatarFallback>{initials}</AvatarFallback></Avatar>
      <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><span className="block truncate text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">{badge}</span></span>
      <ChevronUp className="size-4 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-64 space-y-1">
      <p className="px-2 py-1 font-display text-sm font-semibold">Minha conta</p>
      <label className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"><span className="flex items-center gap-2">{resolvedTheme === "dark" ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}Modo escuro</span><Switch checked={resolvedTheme === "dark"} onCheckedChange={(checked) => changeTheme(setTheme, checked ? "dark" : "light")} aria-label="Ativar modo escuro" /></label>
      <Link href="/avisos" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"><Bell className="size-4" aria-hidden="true" />Avisos e notificações</Link>
      <Link href="/configuracoes" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"><Settings className="size-4" aria-hidden="true" />Configurações</Link>
      <div className="border-t pt-2"><LogoutButton /></div>
    </PopoverContent>
  </Popover>;
}
