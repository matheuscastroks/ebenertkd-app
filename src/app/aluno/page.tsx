import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { RouteLoading } from "@/components/skeletons/route-loading";
import { Button } from "@/components/ui/button";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const minor = profile.role === "minor_student";
  return <PortalShell profile={profile} activePath={ROUTES.student} title="Meu treino" subtitle="Treinos, frequência e graduação.">
    <div className="space-y-6">
      <Suspense fallback={<RouteLoading />}><StudentDashboardDynamic profile={profile} minor={minor} /></Suspense>
      <nav aria-label="Meus dados e documentos" className="divide-y divide-border text-sm">
        <Link className="flex min-h-11 items-center" href={ROUTES.studentEnrollment}>Meus dados</Link>
        <Link className="flex min-h-11 items-center" href={ROUTES.studentContracts}>Documentos e contratos</Link>
        {!minor && profile.capabilities.includes("guardian") ? <Link className="flex min-h-11 items-center" href={ROUTES.guardianDependents}>Meus dependentes</Link> : !minor ?
          <form action={enableGuardianAction}><Button type="submit" variant="ghost" className="min-h-11 px-0">Cadastrar filhos ou dependentes</Button></form> : null}
      </nav>
    </div>
  </PortalShell>;
}
