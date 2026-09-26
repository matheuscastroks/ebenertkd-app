import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { CalendarCheck2, ClipboardList, WalletCards } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const guardian = profile.capabilities.includes("guardian");
  const minor = profile.role === "minor_student";

  const [attendance, charges] = await Promise.all([getAttendanceHistory(profile), minor ? Promise.resolve([]) : listChargesForStudent(profile)]);
  const outstanding = charges.filter((charge) => charge.status === "pending" || charge.status === "overdue" || charge.status === "proof_under_review").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

  return <PortalShell profile={profile} activePath={ROUTES.student} title={`Olá, ${profile.full_name.split(" ")[0]}`} subtitle="Seu treino e seus próximos passos em um só lugar.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Faixa atual" value={attendance.student?.current_belt ?? "Não informada"} icon={<ClipboardList aria-hidden="true" />} />
      <MetricCard label="Frequência registrada" value={attendance.summary.total ? `${attendance.summary.rate}%` : "Sem registros"} helper={attendance.summary.total ? `${attendance.summary.attended} presenças em ${attendance.summary.total} aulas` : "Acompanhe aqui após a primeira chamada."} tone="success" icon={<CalendarCheck2 aria-hidden="true" />} />
      {!minor ? <MetricCard label="Próximo pagamento em aberto" value={outstanding ? money(outstanding.amount_cents) : "Tudo em dia"} helper={outstanding ? `Vence em ${new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : undefined} tone={outstanding ? "warning" : "success"} icon={<WalletCards aria-hidden="true" />} /> : null}
    </div>
    <Card><CardHeader><CardTitle className="text-base">O que você pode fazer agora</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
      <Button asChild><Link href={ROUTES.studentEnrollment}>{attendance.student ? "Ver minha matrícula" : "Preencher minha matrícula"}</Link></Button>
      <Button asChild variant="outline"><Link href={ROUTES.studentAttendance}>Ver frequência</Link></Button>
      {!minor ? <Button asChild variant="outline"><Link href={ROUTES.studentBilling}>Ver pagamentos</Link></Button> : null}
      {!minor && (guardian ? <Button asChild variant="outline"><Link href={ROUTES.guardianDependents}>Meus dependentes</Link></Button> : <form action={enableGuardianAction}><Button type="submit" variant="outline">Cadastrar dependente</Button></form>)}
    </CardContent></Card>
  </PortalShell>;
}
