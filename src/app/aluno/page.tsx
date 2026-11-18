import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const rowClass = "flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm font-medium transition-colors hover:text-primary-text focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none";

function DashboardSkeleton() {
  return <div role="status" aria-label="Carregando visão geral" className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <div className="space-y-6">
      <Card><CardContent className="space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-4 w-48" /></CardContent></Card>
      <Card><CardContent className="space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56" /></CardContent></Card>
    </div>
    <Card><CardContent className="space-y-3"><Skeleton className="h-5 w-24" /><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-44" /></CardContent></Card>
  </div>;
}

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const minor = profile.role === "minor_student";
  const shortcuts = <Card>
    <CardHeader><CardTitle>Dados e documentos</CardTitle></CardHeader>
    <CardContent>
      <nav aria-label="Meus dados e documentos" className="divide-y divide-border">
        <Link className={rowClass} href={ROUTES.studentEnrollment}>Meus dados<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></Link>
        <Link className={rowClass} href={ROUTES.studentContracts}>Documentos e contratos<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></Link>
        {minor ? null : profile.capabilities.includes("guardian")
          ? <Link className={rowClass} href={ROUTES.guardian}>Meus dependentes<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></Link>
          : <form action={enableGuardianAction}><button type="submit" className={rowClass}>Cadastrar filhos ou dependentes<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></button></form>}
      </nav>
    </CardContent>
  </Card>;
  return <PortalShell profile={profile} activePath={ROUTES.student} title="Meu treino" subtitle="Seu próximo treino, pendências e faixa.">
    <Suspense fallback={<DashboardSkeleton />}><StudentDashboardDynamic profile={profile} minor={minor} aside={shortcuts} /></Suspense>
  </PortalShell>;
}
