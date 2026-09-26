import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { getTrainingClass } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Sparkles,
  UserCheck,
  UserPen,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const guardian = profile.capabilities.includes("guardian");
  const minor = profile.role === "minor_student";

  const [attendance, charges] = await Promise.all([
    getAttendanceHistory(profile),
    minor ? Promise.resolve([]) : listChargesForStudent(profile),
  ]);

  const student = attendance.student;
  const isEnrollmentIncomplete = !student || student.status === "draft";
  const isEnrollmentUnderReview = student?.status === "submitted";
  const lastEntry = attendance.entries[0];

  const studentClass = student?.training_class_id
    ? await getTrainingClass(student.training_class_id).catch(() => null)
    : null;

  const nextTraining = studentClass ? getNextClassSchedule(studentClass) : null;

  const outstanding = charges
    .filter(
      (charge) =>
        charge.status === "pending" ||
        charge.status === "overdue" ||
        charge.status === "proof_under_review"
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const isOverdue = outstanding?.status === "overdue";
  const isProofUnderReview = outstanding?.status === "proof_under_review";
  const isPendingPayment = outstanding?.status === "pending";

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.student}
      title={`Olá, ${profile.full_name.split(" ")[0]}`}
      subtitle="Acompanhe seus treinos, frequência e mensalidades na academia."
      headerActions={
        student?.current_belt ? (
          <BeltBadge belt={student.current_belt} gub={student.gub} size="sm" />
        ) : undefined
      }
    >
      {/* 1. Status de Matrícula (Hierarquia de tarefas essenciais) */}
      {isEnrollmentIncomplete ? (
        <Card className="border-warning/50 bg-warning/5 dark:bg-warning/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-warning" aria-hidden="true" />
              <CardTitle className="text-base font-semibold">Ficha de matrícula incompleta</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Complete suas informações pessoais, de saúde, endereço e anexe sua foto para concluir sua matrícula na academia.
            </p>
            <Button asChild size="sm">
              <Link href={ROUTES.studentEnrollment}>
                <FileText aria-hidden="true" />
                Preencher matrícula
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : isEnrollmentUnderReview ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-info/40 bg-info/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-info shrink-0" aria-hidden="true" />
            <span>Sua matrícula foi enviada e está em análise pelo professor.</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.studentEnrollment}>Ver ficha</Link>
          </Button>
        </div>
      ) : null}

      {/* 2. Próximo Treino do Aluno (Card Hero Operacional) */}
      <Card className={cn(
        "relative overflow-hidden border",
        nextTraining?.isToday
          ? "border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-xs"
          : "border-border/80"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {nextTraining?.isToday ? (
                  <Badge variant="default" className="text-xs font-semibold px-2.5 py-0.5">
                    <Sparkles className="size-3 mr-1" aria-hidden="true" />
                    Hoje tem treino!
                  </Badge>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Próximo treino na academia
                  </span>
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold">
                {nextTraining
                  ? nextTraining.isToday
                    ? `Seu treino é hoje, das ${nextTraining.startTime} às ${nextTraining.endTime}`
                    : `${nextTraining.dayLabel}, das ${nextTraining.startTime} às ${nextTraining.endTime}`
                  : student?.training_class || "Turma em definição"}
              </CardTitle>
            </div>
            {studentClass ? (
              <Badge variant="outline" className="text-xs shrink-0 font-normal">
                {studentClass.name}
              </Badge>
            ) : null}
          </div>
          <CardDescription className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-muted-foreground">
            {studentClass?.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{studentClass.location}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Dojô Ebenézer TKD</span>
              </span>
            )}
            {studentClass?.weekdays ? (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Dias: {studentClass.weekdays.join(", ")}</span>
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {lastEntry ? (
              <span>
                Última presença:{" "}
                <strong className="text-foreground">
                  {new Date(lastEntry.lesson.lesson_date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </strong>{" "}
                ({lastEntry.record.status === "present" ? "Presente" : "Justificado"})
              </span>
            ) : (
              <span>Nenhuma falta recente registrada.</span>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.studentAttendance}>
              <CalendarCheck2 className="size-4" aria-hidden="true" />
              Ver minha frequência
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 3. Situação Financeira com Ação Direta (se houver cobrança) */}
      {!minor && outstanding ? (
        <Card className={cn(
          "border",
          isOverdue
            ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
            : isProofUnderReview
              ? "border-info/40 bg-info/5 dark:bg-info/10"
              : "border-warning/40 bg-warning/5 dark:bg-warning/10"
        )}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <WalletCards className={cn(
                  "size-4.5 shrink-0",
                  isOverdue ? "text-destructive" : isProofUnderReview ? "text-info" : "text-warning"
                )} aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">
                  {isProofUnderReview
                    ? "Comprovante em conferência"
                    : isOverdue
                      ? "Mensalidade em atraso"
                      : "Mensalidade do mês em aberto"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isProofUnderReview ? (
                  <>Seu comprovante de <strong>{money(outstanding.amount_cents)}</strong> foi enviado e está sendo analisado pelo professor.</>
                ) : (
                  <>
                    Valor: <strong className="text-foreground">{money(outstanding.amount_cents)}</strong> · Vence
                    {isOverdue ? "u em: " : " em: "}
                    <strong className="text-foreground">
                      {new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </strong>
                  </>
                )}
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
              <Button asChild size="sm" className="w-full sm:w-auto" variant={isProofUnderReview ? "outline" : "default"}>
                <Link href={ROUTES.studentBilling}>
                  <CreditCard className="size-4" aria-hidden="true" />
                  {isProofUnderReview ? "Ver pagamento" : "Pagar via PIX / Enviar comprovante"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 4. Indicadores de Frequência e Graduação */}
      <div className={cn("grid gap-4 sm:grid-cols-2", minor && "sm:grid-cols-1")}>
        <MetricCard
          label="Frequência registrada"
          value={attendance.summary.total ? `${attendance.summary.rate}%` : "100%"}
          helper={
            attendance.summary.total
              ? `${attendance.summary.attended} presenças em ${attendance.summary.total} aulas realizadas`
              : "Sem faltas registradas até o momento."
          }
          tone="success"
          icon={<CalendarCheck2 aria-hidden="true" />}
        />

        {!minor ? (
          <MetricCard
            label={
              outstanding?.status === "proof_under_review"
                ? "Comprovante enviado"
                : outstanding?.status === "overdue"
                  ? "Mensalidade em atraso"
                  : outstanding
                    ? "Mensalidade em aberto"
                    : "Situação financeira"
            }
            value={outstanding ? money(outstanding.amount_cents) : "Tudo em dia"}
            helper={
              outstanding?.status === "proof_under_review"
                ? "Em análise pelo professor"
                : outstanding?.status === "overdue"
                  ? `Venceu em ${new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                  : outstanding
                    ? `Vencimento em ${new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                    : "Nenhuma pendência financeira"
            }
            tone={
              outstanding?.status === "overdue"
                ? "danger"
                : outstanding?.status === "proof_under_review"
                  ? "info"
                  : outstanding
                    ? "warning"
                    : "success"
            }
            icon={<WalletCards aria-hidden="true" />}
          />
        ) : null}
      </div>

      {/* 5. Dados Cadastrais e Ações Rápidas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meus dados cadastrais</CardTitle>
              <UserPen className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <CardDescription className="text-xs">
              Mantenha seu telefone, endereço e informações de emergência sempre atualizados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Nome:</strong> {student?.full_name || profile.full_name}</p>
              {student?.whatsapp ? <p><strong className="text-foreground">WhatsApp:</strong> {student.whatsapp}</p> : null}
              {student?.address ? <p className="truncate"><strong className="text-foreground">Endereço:</strong> {student.address}</p> : null}
            </div>
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.studentEnrollment}>
                  <UserPen className="size-4" aria-hidden="true" />
                  Editar meus dados e endereço
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos e contratos</CardTitle>
            <CardDescription className="text-xs">
              Acesse termos de adesão, contratos de matrícula e pagamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.studentContracts}>
                  <FileText className="size-4" aria-hidden="true" />
                  Meus contratos
                </Link>
              </Button>
              {!minor ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.studentBilling}>
                    <CreditCard className="size-4" aria-hidden="true" />
                    Pagamentos e PIX
                  </Link>
                </Button>
              ) : null}
            </div>

            {!minor ? (
              <div className="pt-2 border-t text-sm">
                {guardian ? (
                  <Button asChild variant="ghost" size="sm" className="px-0">
                    <Link href={ROUTES.guardianDependents} className="flex items-center gap-2">
                      <UsersRound className="size-4" aria-hidden="true" />
                      Acessar painel de dependentes
                    </Link>
                  </Button>
                ) : (
                  <form action={enableGuardianAction}>
                    <Button type="submit" variant="ghost" size="sm" className="px-0">
                      <UserPlus className="size-4" aria-hidden="true" />
                      Cadastrar filhos ou dependentes
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
