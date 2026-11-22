"use client";

import { usePathname } from "next/navigation";
import { NotificationHeaderButton } from "@/components/dashboard/notification-nav-item";
import {
  ScreenSegments,
  SectionSegments,
  useNavItems,
} from "@/components/dashboard/section-nav";
import { PageHeaderSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { dependentSegments } from "@/features/families/paths";
import { resolveNavLocation } from "@/lib/navigation/routes";

/**
 * Carregamento entre rotas:
 * - Em rotas com segmentos irmãos (ex.: Alunos, Financeiro, Faixa, Cadastro) ou telas de um dependente,
 *   mantém o título da seção e a barra de abas reais visíveis enquanto apenas o conteúdo carrega.
 * - Em telas de detalhe em pilha, usa o skeleton de cabeçalho + conteúdo.
 */
export function RouteLoading() {
  const pathname = usePathname();
  const items = useNavItems();
  const { section, isDetail } = resolveNavLocation(items, pathname);
  const dependentMatch = /^\/responsavel\/dependentes\/([^/]+)/.exec(pathname);
  const keepSectionChrome = Boolean(section && !isDetail);

  return (
    <div
      role="status"
      aria-label="Carregando página"
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col bg-sidebar md:overflow-hidden"
    >
      <span className="sr-only">Carregando página…</span>
      {keepSectionChrome && section ? (
        <header className="shrink-0 bg-sidebar px-4 pb-3 pt-4 md:px-6 md:pb-3.5 md:pt-4">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3 md:flex-nowrap md:items-center md:gap-x-6">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="space-y-0.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-foreground">
                  {section.label}
                </h1>
                <Skeleton aria-hidden="true" className="h-5 w-64 max-w-full" />
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <NotificationHeaderButton />
            </div>
          </div>
        </header>
      ) : (
        <PageHeaderSkeleton />
      )}
      <main
        data-slot="dashboard-content"
        className="relative flex min-h-0 flex-1 flex-col bg-background md:mb-2 md:mr-2 md:overflow-y-auto md:rounded-xl md:shadow-sm"
      >
        <div className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
          <div className="flex w-full min-w-0 flex-col gap-6">
            {dependentMatch ? (
              <div className="min-w-0">
                <ScreenSegments
                  label="Seções do dependente"
                  segments={dependentSegments(decodeURIComponent(dependentMatch[1]))}
                />
              </div>
            ) : keepSectionChrome ? (
              <div className="min-w-0 empty:hidden">
                <SectionSegments />
              </div>
            ) : null}
            <div aria-hidden="true" className="space-y-4 rounded-xl bg-card p-4 md:p-5">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
