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
import { dependentAccessPath, dependentSegments } from "@/features/families/paths";
import { primaryPendency } from "@/features/families/pendencies";
import { listGuardianMinors } from "@/features/families/service";
import { GraduationCard } from "@/features/students/components/graduation-card";
import { requireCapability } from "@/lib/auth/session";
import { guardianAttendancePath, ROUTES } from "@/lib/navigation/routes";

/**
 * Resumo de um dependente. Tela nova: a família tinha só cartões com cinco botões por filho;
 * aqui o responsável vê um filho por vez — pendências primeiro, rotina depois e as áreas como navegação.
 */
async function DependentSummary({ guardian, minor }: { guardian: Profile; minor: Profile }) {
  const [snapshot] = await loadDependentSnapshots(guardian, [minor]);
  const { student, summary, next, trainingClass, pendencies } = snapshot;
  const firstName = minor.full_name.split(" ")[0];
  return <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
    <div className="min-w-0 space-y-6">
    {pendencies.length > 0 ? (
      <section aria-labelledby="dependent-pendencies" className="space-y-2.5">
        <h2 id="dependent-pendencies" className="text-base font-semibold">Pendências</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <PendencyList items={pendencies} primaryKey={primaryPendency(pendencies)?.id} subject={minor.full_name} />
        </div>
      </section>
    ) : null}
    <section aria-labelledby="dependent-next-training" className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="space-y-1 p-5">
        <h2 id="dependent-next-training" className="text-sm font-medium text-muted-foreground">Próximo treino</h2>
        <p className="text-xl font-semibold tracking-tight tabular-nums">{formatNextTraining(next)}</p>
        <p className="text-sm text-muted-foreground">{trainingClass ? `${trainingClass.name} · ${trainingClass.location || "Local não informado"}` : "A turma é definida pelo professor ao aprovar a ficha."}</p>
      </div>
      <Link href={guardianAttendancePath(minor.$id)} className="flex min-h-12 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors duration-(--duration-quick) hover:bg-muted motion-reduce:transition-none">
        <span className="tabular-nums">{summary.total ? `Frequência ${summary.rate}% · ${summary.attended} de ${summary.total} aulas` : "Ainda sem aulas registradas"}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </section>
    {pendencies.length === 0 ? <p className="text-sm text-muted-foreground">Nada pendente para {firstName}.</p> : null}
    </div>
    <GraduationCard title="Faixa" rankKey={student?.rank_key} startedAtTkd={student?.started_at_tkd} />
    <Link href={dependentAccessPath(minor.$id)} className="inline-flex w-fit lg:col-span-2 min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
      Acesso e senha de {firstName}
      <ChevronRightIcon className="size-4" aria-hidden="true" />
    </Link>
  </div>;
}

function SummarySkeleton() {
  return <div role="status" aria-label="Carregando resumo" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
    <Skeleton className="h-52 w-full rounded-xl" />
  </div>;
}

export default async function DependentSummaryPage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);
  const minors = await listGuardianMinors(guardian);
  const minor = minors.find((item) => item.$id === profileId);
  if (!minor) notFound();
  return <PortalShell profile={guardian} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(minor.$id)} title={minor.full_name} subtitle="Pendências, treino e faixa."
    headerActions={<DependentSwitcher currentProfileId={minor.$id} section="resumo" siblings={minors.map((item) => ({ profileId: item.$id, name: item.full_name }))} />}>
    <Suspense fallback={<SummarySkeleton />}><DependentSummary guardian={guardian} minor={minor} /></Suspense>
  </PortalShell>;
}
