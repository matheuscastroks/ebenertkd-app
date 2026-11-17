import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { Profile } from "@/features/auth/types";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getOutstandingCharge, outstandingLabel } from "@/features/billing/outstanding";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { formatBrl } from "@/lib/money";
import { guardianAttendancePath, guardianBillingPath, guardianContractsPath, guardianEnrollmentPath, guardianExamsPath, ROUTES } from "@/lib/navigation/routes";

export async function GuardianMinorsOverview({ guardian, minors }: { guardian: Profile; minors: Profile[] }) {
  if (!minors.length) return <EmptyState title="Nenhum dependente cadastrado" description="Cadastre um dependente para acompanhar matrícula e treinos." action={<Button asChild className="min-h-11"><Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link></Button>} />;
  const [classes, photos] = await Promise.all([listTrainingClasses(true), listProfilePhotoDocumentIds(minors.map((minor) => minor.$id))]);
  const data = await Promise.all(minors.map(async (minor) => {
    const [history, charges, contracts] = await Promise.all([
      getAttendanceHistory(guardian, minor.$id), listChargesForStudent(guardian, minor.$id).catch(() => null), listStudentContracts(guardian, minor.$id).catch(() => null)
    ]);
    return { minor, history, charges, contracts };
  }));
  return <div className="grid gap-4 xl:grid-cols-2">{data.map(({ minor, history, charges, contracts }) => {
    const trainingClass = classes.find((item) => item.$id === history.student?.training_class_id);
    const next = trainingClass ? getNextClassSchedule(trainingClass) : null;
    const pending = charges ? getOutstandingCharge(charges) : undefined;
    const pendingContract = contracts?.find((item) => item.status === "pending_signature");
    const status = history.student?.status;
    return <Card key={minor.$id}>
      <CardHeader><div className="flex items-center gap-3"><StudentAvatar name={minor.full_name} photoDocumentId={photos.get(minor.$id)} className="size-11" /><div className="space-y-1"><CardTitle>{minor.full_name}</CardTitle><BeltBadge belt={history.student?.current_belt} gub={history.student?.gub} /></div></div></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <StatusBadge tone={status === "active" ? "success" : status === "submitted" ? "warning" : "neutral"}>{status === "active" ? "Ativo" : status === "submitted" ? "Em análise" : status === "inactive" ? "Inativo" : "Matrícula incompleta"}</StatusBadge>
        <p>Próximo treino: {next ? `${next.isToday ? "Hoje" : next.dayLabel}, ${next.startTime} às ${next.endTime}` : "Horário ainda não definido"}</p>
        <p>Frequência: {history.summary.total ? `${history.summary.rate}%` : "—"}{!history.summary.total ? " · Ainda sem aulas registradas" : null}</p>
        <div className="flex flex-wrap items-center gap-2"><span>Mensalidade:</span>{charges === null ? <span role="alert">Não foi possível carregar os pagamentos. <Link className="underline" href={guardianBillingPath(minor.$id)}>Tentar novamente</Link></span> : pending ? <><StatusBadge tone={pending.status === "overdue" ? "danger" : pending.status === "proof_under_review" ? "info" : "warning"}>{outstandingLabel(pending)}</StatusBadge><span>{formatBrl(pending.amount_cents)}</span></> : <StatusBadge tone="success">Em dia</StatusBadge>}</div>
        {contracts === null ? <p role="alert">Não foi possível carregar contratos. <Link className="underline" href={guardianContractsPath(minor.$id)}>Ver contratos</Link></p> : pendingContract ? <p>Contrato pendente de assinatura · <Link className="underline" href={guardianContractsPath(minor.$id)}>Assinar para {minor.full_name}</Link></p> : null}
        <nav aria-label={`Acessos de ${minor.full_name}`} className="flex flex-wrap gap-2">{[
          ["Ficha", guardianEnrollmentPath(minor.$id)], ["Frequência", guardianAttendancePath(minor.$id)], ["Exames", guardianExamsPath(minor.$id)], ["Financeiro", guardianBillingPath(minor.$id)], ["Contratos", guardianContractsPath(minor.$id)]
        ].map(([label, href]) => <Button key={href} asChild variant="outline" className="min-h-11"><Link href={href}>{label}</Link></Button>)}</nav>
      </CardContent>
    </Card>;
  })}</div>;
}
