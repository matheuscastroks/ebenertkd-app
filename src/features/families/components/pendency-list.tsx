import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Pendency } from "@/features/families/pendencies";

/**
 * Lista de pendências em linhas. `primaryKey` identifica a única ação laranja da tela;
 * `subject` (nome do dependente) entra no nome acessível das ações para evitar agir no filho errado.
 */
export function PendencyList({ items, primaryKey, keyPrefix = "", subject, emptyLabel = "Nada pendente." }: {
  items: Pendency[]; primaryKey?: string; keyPrefix?: string; subject?: string; emptyLabel?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return <ul className="divide-y divide-border">
    {items.map((item) => {
      const primary = primaryKey === `${keyPrefix}${item.id}`;
      return <li key={item.id} role={item.alert ? "alert" : undefined} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
          </div>
          {item.detail ? <p className="text-sm text-muted-foreground tabular-nums">{item.detail}</p> : null}
        </div>
        {item.href && item.actionLabel ? <Button asChild variant={primary ? "default" : "outline"} className="min-h-11 w-full shrink-0 sm:w-auto">
          <Link href={item.href} aria-label={subject ? `${item.actionLabel} de ${subject}` : undefined}>{item.actionLabel}</Link>
        </Button> : null}
      </li>;
    })}
  </ul>;
}
