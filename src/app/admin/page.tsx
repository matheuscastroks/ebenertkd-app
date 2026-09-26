import { PortalShell } from "@/components/dashboard/portal-shell";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { getBillingOverview } from "@/features/billing/report-service";
import { listTrainingClasses } from "@/features/classes/service";
import { listExamEvents } from "@/features/exams/service";
import { countEnrollmentsRequiringReview } from "@/features/students/service";
import { CalendarDays, ClipboardCheck, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  const [pending, classes, billing, exams] = await Promise.all([countEnrollmentsRequiringReview(), listTrainingClasses(), getBillingOverview({ page: 1 }), listExamEvents()]);
  const upcomingExam = exams.filter((exam) => exam.status !== "cancelled" && exam.status !== "completed" && exam.event_date.slice(0, 10) >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  return <PortalShell profile={profile} activePath={ROUTES.admin} title={`Olá, ${profile.full_name.split(" ")[0]}`} subtitle="Veja o que precisa da sua atenção hoje.">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da academia">
      <MetricCard label="Matrículas para analisar" value={pending} tone="warning" icon={<ClipboardCheck aria-hidden="true" />} />
      <MetricCard label="Turmas ativas" value={classes.length} icon={<CalendarDays aria-hidden="true" />} />
      <MetricCard label="Recebido no mês" value={money(billing.summary.receivedCents)} tone="success" icon={<WalletCards aria-hidden="true" />} />
      <MetricCard label="Alunos que pagaram" value={billing.summary.distinctPayingStudents} tone="info" icon={<UsersRound aria-hidden="true" />} />
    </section>
    <Card><CardHeader><CardTitle className="text-base">Próximos passos</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button asChild><Link href={ROUTES.adminEnrollments}>Analisar matrículas</Link></Button><Button asChild variant="outline"><Link href={ROUTES.adminBilling}>Ver financeiro</Link></Button><Button asChild variant="outline"><Link href={ROUTES.adminClasses}>Gerenciar turmas</Link></Button></div><p className="text-sm text-muted-foreground">{upcomingExam ? `Próximo exame: ${upcomingExam.name} em ${new Date(upcomingExam.event_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}.` : "Nenhum exame de faixa agendado."}</p></CardContent></Card>
  </PortalShell>;
}
