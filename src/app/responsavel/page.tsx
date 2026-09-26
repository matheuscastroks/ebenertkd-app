import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { listGuardianMinors } from "@/features/families/service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { requireCapability } from "@/lib/auth/session";
import { formatBrl } from "@/lib/money";
import {
  guardianAttendancePath,
  guardianBillingPath,
  guardianContractsPath,
  guardianEnrollmentPath,
  ROUTES
} from "@/lib/navigation/routes";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  UserPlus
} from "lucide-react";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);

  const [classes, photoIds, minorsData] = await Promise.all([
    listTrainingClasses(true),
    listProfilePhotoDocumentIds(minors.map((minor) => minor.$id)),
    Promise.all(
      minors.map(async (minor) => {
        const [history, charges, contracts] = await Promise.all([
          getAttendanceHistory(guardian, minor.$id),
          listChargesForStudent(guardian, minor.$id).catch(() => []),
          listStudentContracts(guardian, minor.$id).catch(() => [])
        ]);
        return { minor, history, charges, contracts };
      })
    )
  ]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardian}
      title="Meus dependentes"
      subtitle="Acompanhe o treino, frequência e pagamentos da família."
      headerActions={
        minors.length > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.guardianDependents}>
              <UserPlus aria-hidden="true" />
              Adicionar dependente
            </Link>
          </Button>
        ) : null
      }
    >
      {minorsData.length === 0 ? (
        <EmptyState
          title="Nenhum dependente cadastrado"
          description="Ainda não há alunos menores vinculados à sua conta. Cadastre seu primeiro dependente para gerenciar matrícula, treinos e financeiro."
          action={
            <Button asChild>
              <Link href={ROUTES.guardianDependents}>Cadastrar dependente</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {minorsData.map(({ minor, history, charges, contracts }) => {
            const trainingClass = classes.find(
              (c) => c.$id === history.student?.training_class_id
            );
            const nextSchedule = trainingClass ? getNextClassSchedule(trainingClass) : null;
            const pendingContract = contracts.find((c) => c.status === "pending_signature");
            const pendingCharge = charges.find(
              (c) => c.status === "pending" || c.status === "overdue"
            );

            return (
              <Card key={minor.$id} className="overflow-hidden border-border/80 shadow-xs">
                <CardHeader className="space-y-4 pb-3">
                  {/* Topo: Identificação e status do dependente */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar
                        name={minor.full_name}
                        photoDocumentId={photoIds.get(minor.$id)}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate font-semibold">
                          {minor.full_name}
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <BeltBadge
                            belt={history.student?.current_belt}
                            gub={history.student?.gub}
                            size="sm"
                          />
                          {history.student?.status === "draft" && (
                            <Badge
                              variant="outline"
                              className="border-warning/60 bg-warning/10 text-warning-foreground text-[10px]"
                            >
                              Matrícula incompleta
                            </Badge>
                          )}
                          {history.student?.status === "submitted" && (
                            <Badge
                              variant="outline"
                              className="border-info/60 bg-info/10 text-info text-[10px]"
                            >
                              Matrícula em análise
                            </Badge>
                          )}
                          {history.student?.status === "active" && (
                            <Badge
                              variant="outline"
                              className="border-success/60 bg-success/10 text-success text-[10px]"
                            >
                              Ativo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informação contextual de treino e presença */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {nextSchedule ? (
                        nextSchedule.isToday ? (
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <Clock className="size-3.5" aria-hidden="true" />
                            Treino hoje às {nextSchedule.startTime} ({nextSchedule.className})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-foreground">
                            <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            Próximo treino: {nextSchedule.dayLabel} às {nextSchedule.startTime}
                          </span>
                        )
                      ) : (
                        <span>
                          {trainingClass
                            ? `Turma: ${trainingClass.name}`
                            : "Nenhuma turma associada"}
                        </span>
                      )}
                    </div>
                    <span>
                      {history.summary.total
                        ? `${history.summary.rate}% presença (${history.summary.attended}/${history.summary.total} aulas)`
                        : "Sem chamadas registradas"}
                    </span>
                  </div>

                  {/* Banner de Ação Urgente / Pendência */}
                  {pendingContract ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                      <div className="flex items-center gap-2">
                        <FileSignature className="size-4 shrink-0 text-warning" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">Contrato aguardando assinatura</p>
                          <p className="text-[11px] opacity-90">
                            Assine digitalmente para concluir a matrícula.
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="default" className="shrink-0 h-7 text-xs">
                        <Link href={guardianContractsPath(minor.$id)}>Assinar</Link>
                      </Button>
                    </div>
                  ) : history.student?.status === "draft" ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">Ficha de matrícula em rascunho</p>
                          <p className="text-[11px] opacity-90">
                            Complete o cadastro para enviar à coordenação.
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="default" className="shrink-0 h-7 text-xs">
                        <Link href={guardianEnrollmentPath(minor.$id)}>Preencher</Link>
                      </Button>
                    </div>
                  ) : pendingCharge ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      <div className="flex items-center gap-2">
                        <CreditCard className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">
                            Mensalidade em aberto: {formatBrl(pendingCharge.amount_cents)}
                          </p>
                          <p className="text-[11px] opacity-90">
                            Vencimento em{" "}
                            {new Date(pendingCharge.due_date).toLocaleDateString("pt-BR", {
                              timeZone: "America/Sao_Paulo"
                            })}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
                        <Link href={guardianBillingPath(minor.$id)}>Pagar PIX</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2 text-xs text-success">
                      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>Matrícula e mensalidades em dia!</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="outline">
                    <Link href={guardianEnrollmentPath(minor.$id)}>
                      Matrícula
                      {history.student?.status === "draft" && (
                        <span className="ml-1 size-1.5 rounded-full bg-warning" />
                      )}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={guardianAttendancePath(minor.$id)}>Frequência</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={guardianContractsPath(minor.$id)}>
                      Contratos
                      {pendingContract && (
                        <span className="ml-1 size-1.5 rounded-full bg-warning" />
                      )}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={guardianBillingPath(minor.$id)}>
                      Pagamentos
                      {pendingCharge && (
                        <span className="ml-1 size-1.5 rounded-full bg-destructive" />
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
