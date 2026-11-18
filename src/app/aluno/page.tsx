import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const rowClass = "flex min-h-11 w-full items-center justify-between gap-3 py-2.5 text-left text-sm font-medium transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:text-primary-text focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none";

function DashboardSkeleton() {
  return <div role="status" aria-label="Carregando visão geral" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
    <div className="space-y-6">
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  </div>;
}

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const minor = profile.role === "minor_student";
  const shortcuts = <section aria-labelledby="student-shortcuts-title" className="space-y-2.5">
    <h2 id="student-shortcuts-title" className="text-base font-semibold">Dados e documentos</h2>
    <nav aria-label="Meus dados e documentos" className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card px-4 shadow-xs">
      <Link className={rowClass} href={ROUTES.studentEvolution}>Caminho da faixa<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      <Link className={rowClass} href={ROUTES.studentStudies}>Guia de estudos<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      <Link className={rowClass} href={ROUTES.studentCard}>Carteirinha e saúde<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      <Link className={rowClass} href={ROUTES.studentParq}>Questionário de saúde<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      <Link className={rowClass} href={ROUTES.studentEnrollment}>Meus dados<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      <Link className={rowClass} href={ROUTES.studentContracts}>Documentos e contratos<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
      {minor ? null : profile.capabilities.includes("guardian")
        ? <Link className={rowClass} href={ROUTES.guardian}>Meus dependentes<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
        : <form action={enableGuardianAction}><button type="submit" className={rowClass}>Cadastrar filhos ou dependentes<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button></form>}
    </nav>
  </section>;
  return <PortalShell profile={profile} activePath={ROUTES.student} title="Meu treino" subtitle="Seu próximo treino, pendências e faixa.">
    <Suspense fallback={<DashboardSkeleton />}><StudentDashboardDynamic profile={profile} minor={minor} aside={shortcuts} /></Suspense>
  </PortalShell>;
}
