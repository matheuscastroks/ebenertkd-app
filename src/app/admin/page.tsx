import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { CardGridSkeleton, MetricCardsSkeleton } from "@/components/skeletons";
import { requireProfile } from "@/lib/auth/session";
import { SetupCardSection, UrgentTasksSection, TodayClassesSection, AdminMetricsSection, NextExamSection } from "./dashboard-sections";

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  return <PortalShell profile={profile} title="Hoje" subtitle={`Pendências e treinos desta ${weekday}.`}>
    <div className="space-y-6">
      <Suspense fallback={null}><SetupCardSection /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={1} />}><UrgentTasksSection /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={3} columns={3} />}><TodayClassesSection /></Suspense>
      <Suspense fallback={<MetricCardsSkeleton count={2} />}><AdminMetricsSection /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={1} />}><NextExamSection /></Suspense>
    </div>
  </PortalShell>;
}
