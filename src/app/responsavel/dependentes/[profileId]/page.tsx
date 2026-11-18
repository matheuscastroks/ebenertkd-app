import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/features/auth/types";
import { DependentSwitcher } from "@/features/families/components/dependent-header";
import { PendencyList } from "@/features/families/components/pendency-list";
import { loadDependentSnapshots } from "@/features/families/dependent-snapshot";
import { formatNextTraining } from "@/features/families/next-training";
import { dependentSections } from "@/features/families/paths";
import { primaryPendency } from "@/features/families/pendencies";
import { listGuardianMinors } from "@/features/families/service";
import { GraduationCard } from "@/features/students/components/graduation-card";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

/**
 * Resumo de um dependente. Tela nova: a família tinha só cartões com cinco botões por filho;
 * aqui o responsável vê um filho por vez — pendências primeiro, rotina depois e as áreas como navegação.
 */
async function DependentSummary({ guardian, minor }: { guardian: Profile; minor: Profile }) {
  const [snapshot] = await loadDependentSnapshots(guardian, [minor]);
  const { student, summary, next, trainingClass, pendencies } = snapshot;
  const firstName = minor.full_name.split(" ")[0];
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="dependent-pendencies" className="space-y-2.5">
        <h2 id="dependent-pendencies" className="text-base font-semibold">Pendências</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <PendencyList items={pendencies} primaryKey={primaryPendency(pendencies)?.id} subject={minor.full_name} emptyLabel={`Nada pendente para ${firstName}.`} />
        </div>
      </section>
      <section aria-labelledby="dependent-next-training" className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 id="dependent-next-training" className="text-sm font-medium text-muted-foreground">Próximo treino</h2>
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight tabular-nums">{formatNextTraining(next)}</p>
          <p className="text-sm text-muted-foreground">{trainingClass ? `${trainingClass.name} · ${trainingClass.location || "Local não informado"}` : "A turma é definida pelo professor ao aprovar a matrícula."}</p>
        </div>
        <p className="border-t border-border pt-3 text-sm tabular-nums">{summary.total ? `Frequência ${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</p>
      </section>
    </div>
    <div className="min-w-0 space-y-6">
      <GraduationCard title="Faixa" currentBelt={student?.current_belt} gub={student?.gub} startedAtTkd={student?.started_at_tkd} />
      <section aria-labelledby="dependent-areas-title" className="space-y-2.5">
        <h2 id="dependent-areas-title" className="text-base font-semibold">Áreas de {firstName}</h2>
        <nav aria-label={`Áreas de ${minor.full_name}`} className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card px-4 shadow-xs">
          {[...dependentSections(minor.$id), { key: "acesso", label: "Acesso e senha", description: "Login no aplicativo", href: `${ROUTES.guardianDependents}#dependente-${minor.$id}` }].map((section) =>
            <Link key={section.key} href={section.href} className="flex min-h-12 items-center justify-between gap-3 py-2.5 transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:text-primary-text focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none">
              <span className="min-w-0"><span className="block text-sm font-medium">{section.label}</span><span className="block text-sm text-muted-foreground">{section.description}</span></span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>)}
        </nav>
      </section>
    </div>
  </div>;
}

function SummarySkeleton() {
  return <div role="status" aria-label="Carregando resumo" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
    <div className="space-y-6">
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  </div>;
}

export default async function DependentSummaryPage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);
  const minors = await listGuardianMinors(guardian);
  const minor = minors.find((item) => item.$id === profileId);
  if (!minor) notFound();
  return <PortalShell profile={guardian} activePath={ROUTES.guardian} title={minor.full_name} subtitle="Pendências, treino e faixa do dependente."
    breadcrumbs={[{ label: "Minha família", href: ROUTES.guardian }, { label: minor.full_name }]}
    headerActions={<DependentSwitcher currentProfileId={minor.$id} section="resumo" siblings={minors.map((item) => ({ profileId: item.$id, name: item.full_name }))} />}>
    <Suspense fallback={<SummarySkeleton />}><DependentSummary guardian={guardian} minor={minor} /></Suspense>
  </PortalShell>;
}
