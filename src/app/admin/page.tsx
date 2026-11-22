import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineCardsSkeleton, InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { ChevronRight } from "@/components/ui/icons";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { SetupCardSection, UrgentTasksSection, TodayClassesSection, OverdueSection, NextExamSection } from "./dashboard-sections";

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  return <PortalShell profile={profile} title="Hoje" subtitle={`${today[0].toUpperCase()}${today.slice(1)} · o que precisa de você agora.`}>
    <div className="space-y-6">
      <Suspense
        fallback={
          <section className="space-y-3" aria-label="Pendências">
            <h2 className="text-base font-semibold text-foreground">Aguardando você</h2>
            <InlineRowsSkeleton rows={2} label="Carregando pendências…" />
          </section>
        }
      >
        <UrgentTasksSection />
      </Suspense>
      <Suspense
        fallback={
          <section className="space-y-3" aria-label="Treinos de hoje">
            <h2 className="text-base font-semibold">Treinos de hoje</h2>
            <InlineRowsSkeleton rows={2} label="Carregando treinos de hoje…" />
          </section>
        }
      >
        <TodayClassesSection />
      </Suspense>
      <Suspense
        fallback={
          <section className="space-y-3" aria-label="Próximo exame">
            <h2 className="text-base font-semibold text-foreground">Próximo exame de faixa</h2>
            <InlineCardsSkeleton count={1} columns={1} label="Carregando próximo exame…" />
          </section>
        }
      >
        <NextExamSection />
      </Suspense>
      <Suspense
        fallback={
          <Link
            href={`${ROUTES.adminBilling}?status=overdue`}
            className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-xs sm:px-5"
          >
            <span className="text-sm text-muted-foreground">Mensalidades</span>
            <span className="flex items-center gap-1">
              <InlineValueSkeleton className="h-4 w-20" />
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
          </Link>
        }
      >
        <OverdueSection />
      </Suspense>
      <Suspense fallback={null}><SetupCardSection /></Suspense>
    </div>
  </PortalShell>;
}
