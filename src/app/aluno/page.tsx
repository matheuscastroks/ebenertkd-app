import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import {
  AlertCircle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileText,
  UserPlus,
  UsersRound,
  WalletCards
} from "lucide-react";

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const guardian = profile.capabilities.includes("guardian");
  const minor = profile.role === "minor_student";

  const [attendance, charges] = await Promise.all([
    getAttendanceHistory(profile),
    minor ? Promise.resolve([]) : listChargesForStudent(profile)
  ]);

  const outstanding = charges
    .filter(
      (charge) =>
        charge.status === "pending" ||
        charge.status === "overdue" ||
        charge.status === "proof_under_review"
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const money = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

  const student = attendance.student;
  const isEnrollmentIncomplete = !student || student.status === "draft";
  const isEnrollmentUnderReview = student?.status === "submitted";
  const lastEntry = attendance.entries[0];

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.student}
      title={`Olá, ${profile.full_name.split(" ")[0]}`}
      subtitle="Seu treino, graduação e próximos passos na academia."
    >
      {/* 1. Status de Matrícula (Hierarquia de tarefas essenciais) */}
      {isEnrollmentIncomplete ? (
        <Card className="border-warning/50 bg-warning/5 dark:bg-warning/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-warning" aria-hidden="true" />
              <CardTitle className="text-base">Ficha de matrícula incompleta</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Complete suas informações pessoais, de saúde e anexe sua foto para concluir sua matrícula na academia.
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
        <div className="flex items-center justify-between gap-3 rounded-lg border border-info/40 bg-info/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-info shrink-0" aria-hidden="true" />
            <span>Sua matrícula foi enviada e está em análise pelo professor.</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.studentEnrollment}>Ver ficha</Link>
          </Button>
        </div>
      ) : null}

      {/* 2. Métricas de Treino e Graduação */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Faixa atual"
          value={student?.current_belt ? `Faixa ${student.current_belt}` : "Não informada"}
          helper={student?.gub ? `${student.gub}º GUB` : "Graduação do Taekwondo"}
          icon={<ClipboardList aria-hidden="true" />}
        />

        <MetricCard
          label="Frequência registrada"
          value={attendance.summary.total ? `${attendance.summary.rate}%` : "Sem registros"}
          helper={
            attendance.summary.total
              ? `${attendance.summary.attended} presenças em ${attendance.summary.total} aulas`
              : "Acompanhe aqui após a primeira chamada."
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
                  : "Próximo vencimento"
            }
            value={outstanding ? money(outstanding.amount_cents) : "Tudo em dia"}
            helper={
              outstanding?.status === "proof_under_review"
                ? "Comprovante em análise pelo professor"
                : outstanding?.status === "overdue"
                  ? `Venceu em ${new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                  : outstanding
                    ? `Vence em ${new Date(outstanding.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
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

      {/* 3. Informações da Turma e Ações Contextuais */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sua turma e treinos</CardTitle>
              <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {student?.training_class || "Turma não vinculada"}
              </p>
              {lastEntry ? (
                <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  <span>
                    Última aula registrada em{" "}
                    {new Date(lastEntry.lesson.lesson_date).toLocaleDateString("pt-BR", {
                      timeZone: "UTC"
                    })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {lastEntry.record.status === "present"
                      ? "Presente"
                      : lastEntry.record.status === "excused"
                        ? "Justificado"
                        : "Ausente"}
                  </Badge>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma presença computada até o momento.
                </p>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.studentAttendance}>Ver histórico de presença</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.studentEnrollment}>
                  {student ? "Ver dados da matrícula" : "Iniciar matrícula"}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.studentContracts}>Meus contratos</Link>
              </Button>
              {!minor ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.studentBilling}>Pagamentos e PIX</Link>
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
