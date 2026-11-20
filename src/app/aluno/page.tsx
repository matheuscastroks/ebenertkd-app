import { Suspense } from "react";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInSection } from "@/features/classes/components/check-in-section";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando início" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const minor = profile.role === "minor_student";
  // Única porta de entrada para um adulto virar responsável; quem já é usa "Família" no menu.
  const becomeGuardian = minor || profile.capabilities.includes("guardian") ? null : (
    <form action={enableGuardianAction} className="text-sm text-muted-foreground">
      Tem filhos ou dependentes que treinam?{" "}
      <button type="submit" className="min-h-11 font-medium text-primary underline-offset-4 hover:underline">
        Cadastrar dependentes
      </button>
    </form>
  );
  return (
    <PortalShell profile={profile} title="Início" subtitle="Seu próximo treino, pendências e faixa.">
      <div className="space-y-6">
        {/* Check-in só aparece no dia do treino; carrega à parte para não atrasar o resto. */}
        <Suspense fallback={null}>
          <CheckInSection profile={profile} />
        </Suspense>
        <Suspense fallback={<DashboardSkeleton />}>
          <StudentDashboardDynamic profile={profile} minor={minor} footer={becomeGuardian} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
