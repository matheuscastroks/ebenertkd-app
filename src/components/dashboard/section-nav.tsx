"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "@/components/ui/icons";
import { resolveNavLocation, type NavSegment, type SidebarNavItem } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import { useSlidingIndicator } from "@/hooks/use-sliding-indicator";

const NavItemsContext = createContext<SidebarNavItem[]>([]);

/** Disponibiliza as seções do perfil para o conteúdo de cada tela, sem repassar props por página. */
export function NavItemsProvider({ items, children }: { items: SidebarNavItem[]; children: ReactNode }) {
  return <NavItemsContext.Provider value={items}>{children}</NavItemsContext.Provider>;
}

/**
 * Segmentos da seção atual (modelo Seção → Segmento → Pilha).
 * São links por URL, não abas: o voltar do navegador funciona e cada visão tem endereço próprio.
 * Some nas telas de detalhe, que mostram o link de voltar no lugar.
 */
export function SectionSegments() {
  const items = useContext(NavItemsContext);
  const pathname = usePathname();
  const { section, segment, isDetail } = resolveNavLocation(items, pathname);
  const segments = section?.segments ?? [];
  if (isDetail || segments.length < 2) return null;
  return <SegmentBar label={`Seções de ${section!.label}`} segments={segments} active={segment} />;
}

/**
 * Segmentos próprios de uma tela da pilha (ex.: as áreas de um dependente).
 * Ativo = segmento de href mais longo que contém a rota atual.
 */
export function ScreenSegments({ label, segments }: { label: string; segments: NavSegment[] }) {
  const pathname = usePathname();
  const active = segments
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((x, y) => y.href.length - x.href.length)[0];
  return <SegmentBar label={label} segments={segments} active={active} />;
}

/**
 * No celular a barra rola de lado; o segmento ativo pode nascer fora da tela.
 * Centraliza só a barra (sem rolar a página) quando o link ativo é montado.
 */
function centerInScroller(link: HTMLAnchorElement | null) {
  const scroller = link?.closest("nav");
  if (!link || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
  scroller.scrollLeft = link.offsetLeft - (scroller.clientWidth - link.offsetWidth) / 2;
}

function SegmentBar({ label, segments, active }: { label: string; segments: NavSegment[]; active?: NavSegment }) {
  const { containerRef, indicatorRef, ready, moveTo } = useSlidingIndicator<HTMLUListElement>('[aria-current="page"]', "aria-current");
  return (
    <nav aria-label={label} className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <ul ref={containerRef} data-indicator-ready={ready ? "true" : undefined} className="group/segments relative isolate inline-flex min-h-11 items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground">
        <li aria-hidden="true" className="contents">
          <span ref={indicatorRef} className={cn("segmented-indicator pointer-events-none absolute left-0 top-0 rounded-lg transition-[transform,width,height,opacity] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none", ready ? "opacity-100" : "opacity-0")} />
        </li>
        {segments.map((item) => {
          const isActive = item === active;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                ref={isActive ? centerInScroller : undefined}
                onClick={(event) => {
                  if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) moveTo(event.currentTarget, true);
                }}
                className={cn(
                  "relative z-1 inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "segmented-selected text-foreground group-data-[indicator-ready=true]/segments:bg-transparent" : "hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type BackTarget = { label: string; href: string };

/** Voltar da pilha, no padrão iOS: chevron + nome da tela anterior, acima do título. */
export function BackLink({ label, href }: BackTarget) {
  return (
    <Link
      href={href}
      aria-label={`Voltar para ${label}`}
      className="relative -ml-1 inline-flex min-h-8 max-w-full after:absolute after:inset-x-0 after:-inset-y-1.5 items-center gap-0.5 rounded-lg pr-2 text-sm font-medium text-primary-text transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:text-primary-hover motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
