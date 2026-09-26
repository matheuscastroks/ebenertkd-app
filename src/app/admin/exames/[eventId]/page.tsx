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
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { getExamEventBundle } from "@/features/exams/service";
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
  const bundle = await getExamEventBundle(eventId);

  const notice = query.added
    ? "Aluno inscrito e cobrança gerada com sucesso."
    : query.graded
      ? "Resultado registrado com sucesso e graduação atualizada."
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  const hasActiveParticipants = bundle.participants.some(
    ({ participant }) => participant.status === "registered"
  );

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminExams}
      title={bundle.event.name}
      subtitle="Gerencie a lista de candidatos, taxas individuais e avaliações práticas de faixa."
      breadcrumbs={[
        { label: "Exames de faixa", href: ROUTES.adminExams },
        { label: bundle.event.name },
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
                  <CardTitle className="text-lg sm:text-xl font-bold">{bundle.event.name}</CardTitle>
                </div>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm mt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-4 text-muted-foreground" />
                    {new Date(bundle.event.event_date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-muted-foreground" />
                    {bundle.event.location ?? "Local a definir"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="size-4 text-muted-foreground" />
                    Taxa base: {formatBrl(bundle.event.default_fee_cents)}
                  </span>
                </CardDescription>
              </div>

              {!["completed", "cancelled"].includes(bundle.event.status) ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={hasActiveParticipants}
                      className="h-10 text-xs sm:text-sm font-medium shrink-0"
                    >
                      Cancelar exame
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar {bundle.event.name}?</AlertDialogTitle>
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

                        <div>
                          <StatusBadge tone={participantTones[participant.status]}>
                            {participantLabels[participant.status]}
                          </StatusBadge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm rounded-xl border border-border/50 bg-muted/20 p-3">
                        <span className="text-muted-foreground">
                          Taxa: <strong className="text-foreground font-mono">{formatBrl(participant.fee_cents)}</strong>
                          {" · "}Cobrança:{" "}
                          <span className="font-semibold text-foreground capitalize">
                            {charge?.status.replaceAll("_", " ") ?? "não gerada"}
                          </span>
                        </span>
                        {participant.result_notes ? (
                          <span className="text-muted-foreground italic">
                            Nota: &ldquo;{participant.result_notes}&rdquo;
                          </span>
                        ) : null}
                      </div>

                      {registered ? (
                        <div className="space-y-3 pt-1">
                          <form
                            action={recordExamResultAction}
                            className="flex flex-col sm:flex-row gap-3 items-end"
                          >
                            <input type="hidden" name="event_id" value={eventId} />
                            <input
                              type="hidden"
                              name="participant_id"
                              value={participant.$id}
                            />

                            <div className="w-full flex-1">
                              <label className="grid gap-1.5">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Observações técnicas da banca
                                </span>
                                <Input
                                  name="notes"
                                  placeholder="Ex: Excelente Poomsae e postura firme..."
                                  className="h-11 text-xs sm:text-sm"
                                />
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                              <FormSubmitButton
                                name="result"
                                value="approved"
                                pendingLabel="Aprovando…"
                                className="h-11 font-medium flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="mr-1.5 size-4" />
                                Aprovar
                              </FormSubmitButton>

                              <FormSubmitButton
                                name="result"
                                value="failed"
                                variant="outline"
                                pendingLabel="Reprovando…"
                                className="h-11 font-medium flex-1 sm:flex-none border-destructive/30 text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="mr-1.5 size-4" />
                                Reprovar
                              </FormSubmitButton>

                              <FormSubmitButton
                                name="result"
                                value="absent"
                                variant="outline"
                                pendingLabel="Marcando…"
                                className="h-11 font-medium flex-1 sm:flex-none"
                              >
                                Ausente
                              </FormSubmitButton>
                            </div>
                          </form>

                          <div className="pt-2 flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 text-xs text-destructive hover:bg-destructive/10"
                                >
                                  Cancelar inscrição
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Cancelar inscrição de {student!.full_name}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {paidLike
                                      ? "A cobrança possui pagamento registrado ou comprovante enviado. Escolha como o valor será administrado no sistema."
                                      : "A cobrança pendente será cancelada e o histórico do aluno permanecerá íntegro."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <form action={cancelExamParticipantAction}>
                                  <input type="hidden" name="event_id" value={eventId} />
                                  <input
                                    type="hidden"
                                    name="participant_id"
                                    value={participant.$id}
                                  />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                                    {paidLike ? (
                                      <>
                                        <AlertDialogAction
                                          type="submit"
                                          name="financial_decision"
                                          value="future_credit"
                                          variant="outline"
                                        >
                                          Gerar crédito futuro
                                        </AlertDialogAction>
                                        <AlertDialogAction
                                          type="submit"
                                          name="financial_decision"
                                          value="keep_charge"
                                          variant="destructive"
                                        >
                                          Manter cobrança
                                        </AlertDialogAction>
                                      </>
                                    ) : (
                                      <AlertDialogAction
                                        type="submit"
                                        variant="destructive"
                                      >
                                        Confirmar cancelamento
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </form>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
