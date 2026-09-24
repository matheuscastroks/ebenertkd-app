import type { ReactNode } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/features/auth/types";

export function PhaseOnePanel({ profile, activePath, title, description, items, children }: {
  profile: Profile; activePath: string; title: string; description: string;
  items: Array<{ title: string; description: string }>;
  children?: ReactNode;
}) {
  return (
    <PortalShell profile={profile} activePath={activePath} title={`${title} · ${profile.full_name}`} subtitle={description}>
      <section className="grid gap-4 md:grid-cols-3">
        {items.map((item) => <Card key={item.title}><CardHeader><CardTitle className="text-base">{item.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{item.description}</CardContent></Card>)}
      </section>
      {children}
    </PortalShell>
  );
}
