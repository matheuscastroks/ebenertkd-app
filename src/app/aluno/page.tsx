import { Suspense } from "react";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInSection } from "@/features/classes/components/check-in-section";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

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
        <Suspense
          fallback={
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <section aria-label="Próximo treino" className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
                <div className="space-y-2 p-5">
                  <h2 className="text-sm font-medium text-muted-foreground">Próximo treino</h2>
                  <Skeleton className="h-7 w-44" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <div className="px-5 py-3">
                  <Skeleton className="h-4 w-48" />
                </div>
              </section>
              <section aria-label="Faixa" className="space-y-3 rounded-xl bg-card p-5 shadow-xs">
                <h2 className="text-sm font-medium text-muted-foreground">Faixa</h2>
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-44" />
              </section>
              {becomeGuardian ? <div className="lg:col-span-2">{becomeGuardian}</div> : null}
            </div>
          }
        >
          <StudentDashboardDynamic profile={profile} minor={minor} footer={becomeGuardian} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
