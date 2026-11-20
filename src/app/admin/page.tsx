import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { CardGridSkeleton, MetricCardsSkeleton } from "@/components/skeletons";
import { requireProfile } from "@/lib/auth/session";
import { SetupCardSection, UrgentTasksSection, TodayClassesSection, OverdueSection, NextExamSection } from "./dashboard-sections";

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  return <PortalShell profile={profile} title="Hoje" subtitle={`${today[0].toUpperCase()}${today.slice(1)} · o que precisa de você agora.`}>
    <div className="space-y-6">
      <Suspense fallback={<CardGridSkeleton count={1} />}><UrgentTasksSection /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={3} columns={3} />}><TodayClassesSection /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={1} />}><NextExamSection /></Suspense>
      <Suspense fallback={<MetricCardsSkeleton count={1} />}><OverdueSection /></Suspense>
      <Suspense fallback={null}><SetupCardSection /></Suspense>
    </div>
  </PortalShell>;
}
