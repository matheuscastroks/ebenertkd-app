import { Suspense } from "react";
import {
  addExamParticipantAction,
  cancelExamEventAction,
  cancelExamParticipantAction,
  recordExamResultAction,
} from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, ListItemsSkeleton } from "@/components/skeletons";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { getExamEvent, getExamEventBundle } from "@/features/exams/service";
import { beltForGub, type GubOption } from "@/features/students/options";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  MapPin,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

const participantLabels = {
  registered: "Inscrito",
  approved: "Aprovado",
  failed: "Reprovado",
  absent: "Ausente",
  cancelled: "Cancelado",
} as const;

const participantTones = {
  registered: "info",
  approved: "success",
  failed: "danger",
  absent: "warning",
  cancelled: "neutral",
} as const;

async function ExamBundleSections({ eventId }: { eventId: string }) {
  const bundle = await getExamEventBundle(eventId);

  return (
    <div className="space-y-6">
      {/* Alunos Elegíveis */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">Alunos elegíveis</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Matrículas ativas com próxima graduação válida no sistema.
          </p>
        </div>

        {bundle.eligibleStudents.length === 0 ? (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-6 text-center text-xs sm:text-sm text-muted-foreground">
              Nenhum aluno adicional elegível para este exame no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bundle.eligibleStudents.map(({ student, photoDocumentId }) => {
              const targetGub = (student!.gub! - 1) as GubOption;
              const targetBelt = beltForGub(targetGub)!;

              return (
                <Card
                  key={student!.$id}
                  className="border-border/80 shadow-sm transition-all hover:border-border"
                >
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <StudentAvatar name={student!.full_name} photoDocumentId={photoDocumentId} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm text-foreground">
                          {student!.full_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <BeltBadge belt={student!.current_belt} gub={student!.gub} size="sm" />
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <BeltBadge belt={targetBelt} gub={targetGub} size="sm" />
                        </div>
                      </div>
                    </div>

                    <ResponsiveDialog
                      trigger={
                        <Button
                          className="h-10 w-full sm:w-auto font-medium"
                          disabled={
                            bundle.event.status === "cancelled" ||
                            bundle.event.status === "completed"
                          }
                        >
                          Inscrever
                        </Button>
                      }
                      title={`Inscrever ${student!.full_name}`}
                      description="A confirmação registra a inscrição e gera automaticamente uma cobrança individual no financeiro do aluno."
                    >
                      <form action={addExamParticipantAction} className="space-y-4 pt-2">
                        <input type="hidden" name="event_id" value={eventId} />
                        <input type="hidden" name="student_id" value={student!.$id} />
                        <input type="hidden" name="target_gub" value={targetGub} />
                        <input type="hidden" name="target_belt" value={targetBelt} />

                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 text-xs sm:text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Graduação pretendida:</span>
                            <span className="font-semibold text-foreground">
                              {targetBelt} ({targetGub}º GUB)
                            </span>
                          </div>
                        </div>

                        <Field>
                          <FieldLabel htmlFor={`fee-${student!.$id}`} className="text-xs sm:text-sm font-semibold">
                            Taxa individual do exame (R$)
                          </FieldLabel>
                          <Input
                            id={`fee-${student!.$id}`}
                            name="fee_reais"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            defaultValue={centsToReaisInput(bundle.event.default_fee_cents)}
                            required
                            className="h-11 font-mono font-medium"
                          />
                          <FieldDescription className="text-xs">
                            Será registrada como uma cobrança individual na aba de mensalidades e exames do aluno.
                          </FieldDescription>
                        </Field>

                        <FormSubmitButton
                          className="h-11 w-full font-medium"
                          pendingLabel="Inscrevendo aluno…"
                        >
                          Confirmar inscrição no exame
                        </FormSubmitButton>
                      </form>
                    </ResponsiveDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Participantes Inscritos e Avaliação */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Candidatos inscritos ({bundle.participants.length})
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Lance a avaliação técnica de cada candidato. Ao aprovar, a faixa e o histórico marcial são atualizados automaticamente.
          </p>
        </div>

        {bundle.participants.length === 0 ? (
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-8 text-center text-xs sm:text-sm text-muted-foreground">
              Nenhum participante inscrito neste exame de faixa até o momento.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bundle.participants.map(({ participant, student, photoDocumentId, charge }) => {
              const registered = participant.status === "registered";
              const paidLike =
                charge && ["paid", "proof_under_review"].includes(charge.status);

              return (
                <Card
                  key={participant.$id}
                  className="border-border/80 shadow-sm transition-all hover:border-border"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          name={student!.full_name}
                          photoDocumentId={photoDocumentId}
                        />
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {student!.full_name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <span>Atual:</span>
                            <BeltBadge
                              belt={student!.current_belt}
                              gub={student!.gub}
                              size="sm"
                            />
                            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                            <span>Alvo:</span>
                            <BeltBadge
                              belt={participant.target_belt}
                              gub={participant.target_gub}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={participantTones[participant.status]}>
                          {participantLabels[participant.status]}
                        </StatusBadge>

                        {charge ? (
                          <StatusBadge tone={paidLike ? "success" : "warning"}>
                            {charge.status === "paid"
                              ? "Taxa quitada"
                              : charge.status === "proof_under_review"
                                ? "Comprovante enviado"
                                : "Taxa em aberto"}
                          </StatusBadge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Taxa combinada:</span>
                      <span className="font-semibold text-foreground font-mono">
                        {formatBrl(participant.fee_cents)}
                      </span>
                    </div>

                    {registered && bundle.event.status !== "completed" ? (
                      <div className="space-y-4 pt-2">
                        <form action={recordExamResultAction} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                          <input type="hidden" name="participant_id" value={participant.$id} />
                          <input type="hidden" name="event_id" value={eventId} />

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field>
                              <FieldLabel className="text-xs font-semibold">Avaliação técnica</FieldLabel>
                              <select
                                name="result"
                                defaultValue="approved"
                                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="approved">Aprovado (Promover graduação)</option>
                                <option value="failed">Reprovado (Manter faixa atual)</option>
                                <option value="absent">Ausente (Não compareceu)</option>
                              </select>
                            </Field>

                            <Field>
                              <FieldLabel className="text-xs font-semibold">Parecer / Feedback para o aluno</FieldLabel>
                              <Input
                                name="notes"
                                placeholder="Pontos fortes, ajustes de postura e chutes..."
                                className="h-11 text-sm"
                              />
                            </Field>
                          </div>

                          <div className="flex justify-end pt-1">
                            <FormSubmitButton
                              className="h-11 w-full sm:w-auto font-medium"
                              pendingLabel="Gravando resultado…"
                            >
                              <UserCheck className="mr-2 size-4" />
                              Registrar resultado do exame
                            </FormSubmitButton>
                          </div>
                        </form>

                        <div className="flex justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 text-xs h-9"
                              >
                                <XCircle className="mr-1.5 size-3.5" />
                                Cancelar inscrição deste aluno
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Cancelar inscrição de {student!.full_name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {charge?.status === "paid"
                                    ? "A taxa já consta como quitada. Você deve decidir se manterá o valor arrecadado ou concederá crédito futuro."
                                    : "A taxa individual em aberto será automaticamente cancelada."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <form action={cancelExamParticipantAction} className="space-y-4">
                                <input type="hidden" name="participant_id" value={participant.$id} />
                                <input type="hidden" name="event_id" value={eventId} />

                                {charge?.status === "paid" ? (
                                  <Field>
                                    <FieldLabel className="text-xs font-semibold">Tratamento do valor quitado</FieldLabel>
                                    <select
                                      name="paid_charge_decision"
                                      defaultValue="retain_as_revenue"
                                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <option value="retain_as_revenue">
                                        Manter valor arrecadado (taxa administrativa)
                                      </option>
                                      <option value="issue_credit">
                                        Conceder crédito para o próximo exame
                                      </option>
                                    </select>
                                  </Field>
                                ) : null}

                                <AlertDialogFooter>
                                  <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                                  <AlertDialogAction type="submit" variant="destructive">
                                    Confirmar cancelamento da inscrição
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </form>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Resultado:</span>
                          <span className="font-medium text-foreground">
                            {participantLabels[participant.status]}
                          </span>
                        </div>
                        {participant.result_notes ? (
                          <div>
                            <span className="text-muted-foreground block text-xs mt-1">Feedback do mestre:</span>
                            <p className="text-foreground italic">{participant.result_notes}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ExamSectionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <CardGridSkeleton count={2} columns={2} />
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-96" />
        </div>
        <ListItemsSkeleton count={3} />
      </div>
    </div>
  );
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ added?: string; graded?: string; cancelled?: string; error?: string }>;
}) {
  const [admin, { eventId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams,
  ]);
  const event = await getExamEvent(eventId);

  const notice = query.added
    ? "Aluno inscrito e cobrança gerada com sucesso."
    : query.graded
      ? "Resultado registrado com sucesso e graduação atualizada."
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminExams}
      title={event.name}
      subtitle="Gerencie a lista de candidatos, taxas individuais e avaliações práticas de faixa."
      breadcrumbs={[
        { label: "Exames de faixa", href: ROUTES.adminExams },
        { label: event.name },
      ]}
    >
      <div className="w-full min-w-0 space-y-6">
        {notice ? (
          <OperationToast
            tone="success"
            title={notice}
            clearParams={["added", "graded", "cancelled"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível concluir a operação"
            description={
              query.error === "cancel"
                ? "Cobranças já quitadas exigem optar entre conceder crédito futuro ou manter o valor arrecadado."
                : "Confira os dados enviados e tente novamente."
            }
            clearParams={["error"]}
          />
        ) : null}

        {/* Resumo do Evento */}
        <Card className="border-border/80 shadow-sm bg-gradient-to-r from-card via-card to-muted/20">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Award className="size-5" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold">{event.name}</CardTitle>
                </div>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm mt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-4 text-muted-foreground" />
                    {new Date(event.event_date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-muted-foreground" />
                    {event.location ?? "Local a definir"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="size-4 text-muted-foreground" />
                    Taxa base: {formatBrl(event.default_fee_cents)}
                  </span>
                </CardDescription>
              </div>

              {!["completed", "cancelled"].includes(event.status) ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="h-10 text-xs sm:text-sm font-medium shrink-0"
                    >
                      Cancelar exame
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar {event.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O evento será marcado como cancelado e não receberá mais novas inscrições. Certifique-se de tratar todas as inscrições ativas antes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <form action={cancelExamEventAction}>
                      <input type="hidden" name="event_id" value={eventId} />
                      <AlertDialogFooter>
                        <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                        <AlertDialogAction type="submit" variant="destructive">
                          Confirmar cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {/* Dynamic Sections in Suspense */}
        <Suspense fallback={<ExamSectionsSkeleton />}>
          <ExamBundleSections eventId={eventId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
