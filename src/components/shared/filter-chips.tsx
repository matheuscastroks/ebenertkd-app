import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterChip = {
  label: string;
  href: string;
  count?: number;
  active?: boolean;
  /** Destaca a contagem quando o filtro pede ação (ex.: vencidos). */
  urgent?: boolean;
};

/**
 * Linha de filtros por URL com contagem: substitui faixas de KPIs que só servem para filtrar a lista.
 * Cada chip é um link, então o voltar do navegador desfaz o filtro.
 */
export function FilterChips({ label, items, scroll = false }: { label: string; items: FilterChip[]; /** true para chips que levam a âncoras na própria página. */ scroll?: boolean }) {
  return (
    <nav aria-label={label} className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              scroll={scroll}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors duration-(--duration-quick) motion-reduce:transition-none",
                item.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {item.label}
              {item.count === undefined ? null : (
                <span
                  className={cn(
                    "tabular-nums",
                    item.active ? "text-background/80" : item.urgent && item.count > 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
