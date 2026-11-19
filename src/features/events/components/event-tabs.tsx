"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EventTab = { id: string; label: string; badge?: number; content: ReactNode };

/** Abas do detalhe do evento. Os painéis chegam prontos do servidor; a aba inicial vem de `?aba=`. */
export function EventTabs({ tabs, initial }: { tabs: EventTab[]; initial?: string }) {
  const defaultValue = tabs.some((tab) => tab.id === initial) ? initial : tabs[0]?.id;
  return (
    <Tabs defaultValue={defaultValue} className="w-full min-w-0 gap-4">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="min-h-11 flex-none px-3">
            {tab.label}
            {tab.badge ? <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{tab.badge}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="min-w-0 space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
