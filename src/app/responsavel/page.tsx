import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listGuardianMinors } from "@/features/families/service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { requireCapability } from "@/lib/auth/session";
import { guardianAttendancePath, guardianBillingPath, guardianEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);
  const summaries = await Promise.all(minors.map(async (minor) => ({ minor, history: await getAttendanceHistory(guardian, minor.$id) })));
  return <PortalShell profile={guardian} activePath={ROUTES.guardian} title="Meus dependentes" subtitle="Acompanhe o treino e os pagamentos da família.">
    {summaries.length === 0 ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-6"><p className="text-sm text-muted-foreground">Ainda não há alunos vinculados à sua conta.</p><Button asChild><Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link></Button></CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{summaries.map(({ minor, history }) => <Card key={minor.$id}><CardHeader><div className="flex items-center gap-3"><Avatar><AvatarFallback>{minor.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div><CardTitle className="text-base">{minor.full_name}</CardTitle><p className="text-sm text-muted-foreground">{history.student?.current_belt ? `Faixa ${history.student.current_belt}` : "Faixa não informada"} · {history.summary.total ? `${history.summary.rate}% de frequência` : "Sem chamadas registradas"}</p></div></div></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href={guardianEnrollmentPath(minor.$id)}>Matrícula</Link></Button><Button asChild variant="outline" size="sm"><Link href={guardianAttendancePath(minor.$id)}>Frequência</Link></Button><Button asChild variant="outline" size="sm"><Link href={guardianBillingPath(minor.$id)}>Pagamentos</Link></Button></CardContent></Card>)}</div>}
  </PortalShell>;
}
