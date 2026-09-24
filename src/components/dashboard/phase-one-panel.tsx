import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PhaseOnePanel({ name, badge, title, description, items, children }: {
  name: string; badge: string; title: string; description: string;
  items: Array<{ title: string; description: string }>;
  children?: ReactNode;
}) {
  return (
    <DashboardShell title={`${title} · ${name}`} subtitle={description} badge={badge}
      navItems={[{ label: "Visão geral", href: "#", active: true }]}
      asideTitle="Fase 1" asideCopy="Acesso seguro e perfis separados. Os cadastros completos entram na próxima fase."
      headerActions={<LogoutButton />}>
      <section className="grid gap-4 md:grid-cols-3">
        {items.map((item) => <Card key={item.title}><CardHeader><CardTitle className="text-base">{item.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{item.description}</CardContent></Card>)}
      </section>
      {children}
    </DashboardShell>
  );
}
