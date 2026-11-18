import { ExamResultActions } from "@/features/billing/components/exam-result-actions";
import { Suspense } from "react";
import {
  addExamParticipantAction,
  cancelExamEventAction,
  cancelExamParticipantAction,
} from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, ListItemsSkeleton } from "@/components/skeletons";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";
import { getExamEvent, getExamEventBundle } from "@/features/exams/service";
import { examEventLabels, examEventTones, examParticipantLabels, examParticipantTones, formatExamDate } from "@/features/exams/labels";
import { beltForGub, type GubOption } from "@/features/students/options";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { ChevronDown } from "lucide-react";

const eventLabels = examEventLabels;
const eventTones = examEventTones;
const participantLabels = examParticipantLabels;
const participantTones = examParticipantTones;

async function ExamBundleSections({ eventId }: { eventId: string }) {
  const bundle = await getExamEventBundle(eventId);

  // Group participants by target belt
  const groupsMap = new Map<
    number,
    {
      targetBelt: string;
      targetGub: number;
      participants: typeof bundle.participants;
    }
  >();

  for (const p of bundle.participants) {
    const gub = p.participant.target_gub ?? 0;
    if (!groupsMap.has(gub)) {
      groupsMap.set(gub, {
        targetBelt: p.participant.target_belt,
        targetGub: gub,
        participants: [],
      });
    }
    groupsMap.get(gub)!.participants.push(p);
  }

  // Sort groups by GUB descending (from 10º, 9º down to 1º and 0º/Dan)
  const sortedGroups = Array.from(groupsMap.values()).sort(
    (a, b) => b.targetGub - a.targetGub
  );

  const registeredCount = bundle.participants.filter(
    (p) => p.participant.status === "registered"
  ).length;
  const approvedCount = bundle.participants.filter(
    (p) => p.participant.status === "approved"
  ).length;
  const eventClosed = bundle.event.status === "completed" || bundle.event.status === "cancelled";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ======================================================== */}
      {/* COLUNA PRINCIPAL (65% / 8 de 12 colunas): MESA DA BANCA  */}
      {/* ======================================================== */}
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Mesa da banca</h2>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{bundle.participants.length}</span> {bundle.participants.length === 1 ? "candidato" : "candidatos"}
            {registeredCount > 0 ? <> · <span className="tabular-nums">{registeredCount}</span> sem resultado</> : null}
            {" · "}agrupados pela faixa pretendida.
          </p>
        </div>

        {bundle.participants.length === 0 ? (
          <EmptyState
            title="Nenhum candidato inscrito"
            description="Inscreva os alunos elegíveis na lista ao lado (abaixo, no celular)."
          />
        ) : (
          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <div key={group.targetGub} className="space-y-3">
                {/* Cabeçalho do Grupo de Faixa-Alvo */}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    Para faixa {group.targetBelt} ({group.targetGub === 0 ? "1º dan" : `${group.targetGub}º gub`})
                  </h3>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {group.participants.length} {group.participants.length === 1 ? "aluno" : "alunos"}
                  </span>
                </div>

                {/* Cards de Praticantes no Grupo */}
                <div className="space-y-3">
                  {group.participants.map(
                    ({ participant, student, photoDocumentId, charge }) => {
                      const isRegistered = participant.status === "registered";
                      const isApproved = participant.status === "approved";
                      const isFailed = participant.status === "failed";
                      const isAbsent = participant.status === "absent";
                      const paidLike =
                        charge &&
                        ["paid", "proof_under_review"].includes(charge.status);

                      return (
                        <Card key={participant.$id}>
                          <CardContent className="p-4 sm:p-5 space-y-3">
                            {/* Linha Superior: Aluno, Faixas e Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <StudentAvatar
                                  name={student!.full_name}
                                  photoDocumentId={photoDocumentId}
                                  className="size-11"
                                />
                                <div className="min-w-0">
                                  <h4 className="truncate text-base font-medium">
                                    {student!.full_name}
                                  </h4>
                                  <div className="mt-1">
                                    <BeltProgressionPill
                                      fromBelt={student!.current_belt}
                                      fromGub={student!.gub}
                                      toBelt={participant.target_belt}
                                      toGub={participant.target_gub}
                                      size="sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
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

                            {/* Área de Avaliação Táctil de 1 Toque (quando registrado) */}
                            {isRegistered && !eventClosed ? (
                              <div className="border-t border-border pt-3">
                                <div className="space-y-3">
                                  <ExamResultActions participantId={participant.$id} eventId={eventId} name={student!.full_name} currentBelt={student!.current_belt ?? "Sem faixa"} targetBelt={participant.target_belt} feeCents={charge?.amount_cents ?? bundle.event.default_fee_cents} />
                                  <div className="flex justify-end">
                                    {/* Cancelar Inscrição */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="min-h-11 text-destructive"
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
                                            {charge?.status === "paid"
                                              ? "A taxa já consta como quitada. Escolha se deseja manter o valor arrecadado como taxa administrativa ou conceder crédito futuro."
                                              : "A taxa individual em aberto será automaticamente cancelada no financeiro do aluno."}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <form action={cancelExamParticipantAction} className="space-y-4">
                                          <input type="hidden" name="participant_id" value={participant.$id} />
                                          <input type="hidden" name="event_id" value={eventId} />

                                          {charge?.status === "paid" ? (
                                            <Field>
                                              <FieldLabel>
                                                Tratamento do valor quitado
                                              </FieldLabel>
                                              <select
                                                name="financial_decision"
                                                defaultValue="keep_charge"
                                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                              >
                                                <option value="keep_charge">
                                                  Manter valor arrecadado (taxa administrativa)
                                                </option>
                                                <option value="future_credit">
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
                              </div>
                            ) : (
                              /* Resultado Já Homologado */
                              <div className="space-y-1 border-t border-border pt-3 text-sm">
                                <p className="font-medium">
                                  Parecer da banca: {participantLabels[participant.status]}
                                  {isApproved ? <span className="text-muted-foreground"> · graduação registrada</span> : null}
                                  {isFailed || isAbsent ? <span className="text-muted-foreground"> · faixa mantida</span> : null}
                                </p>
                                {participant.result_notes ? (
                                  <p className="text-muted-foreground">{participant.result_notes}</p>
                                ) : null}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLUNA LATERAL DE APOIO (35% / 4 de 12 colunas): ELEGÍVEIS */}
      {/* ======================================================== */}
      <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">Alunos elegíveis</CardTitle>
            <CardDescription>
              {bundle.eligibleStudents.length} com matrícula ativa e próxima faixa disponível.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            {bundle.eligibleStudents.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Nenhum aluno elegível fora da banca. Todos os aptos já estão inscritos.
              </p>
            ) : (
              <ul className="max-h-[460px] divide-y divide-border overflow-y-auto">
                {bundle.eligibleStudents.map(({ student, photoDocumentId }) => {
                  const targetGub = (student!.gub! - 1) as GubOption;
                  const targetBelt = beltForGub(targetGub)!;

                  return (
                    <li key={student!.$id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <StudentAvatar name={student!.full_name} photoDocumentId={photoDocumentId} className="size-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{student!.full_name}</p>
                          <p className="truncate text-sm text-muted-foreground">Para faixa {targetBelt}</p>
                        </div>
                      </div>

                      <ResponsiveDialog
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 shrink-0"
                            disabled={eventClosed}
                            aria-label={`Inscrever ${student!.full_name}`}
                          >
                            Inscrever
                          </Button>
                        }
                        title={`Inscrever ${student!.full_name}`}
                        description="A inscrição cria uma cobrança individual no financeiro do aluno."
                      >
                        <form action={addExamParticipantAction} className="space-y-4 pt-2">
                          <input type="hidden" name="event_id" value={eventId} />
                          <input type="hidden" name="student_id" value={student!.$id} />
                          <input type="hidden" name="target_gub" value={targetGub} />
                          <input type="hidden" name="target_belt" value={targetBelt} />

                          <p className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                            <span className="text-muted-foreground">Graduação pretendida</span>
                            <span className="font-medium">{targetBelt} ({targetGub}º gub)</span>
                          </p>

                          <Field>
                            <FieldLabel htmlFor={`fee-${student!.$id}`}>Taxa individual do exame (R$)</FieldLabel>
                            <Input
                              id={`fee-${student!.$id}`}
                              name="fee_reais"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              defaultValue={centsToReaisInput(bundle.event.default_fee_cents)}
                              required
                              className="h-11 tabular-nums"
                            />
                            <FieldDescription>Vence na data do exame.</FieldDescription>
                          </Field>

                          <FormSubmitButton className="min-h-11 w-full" pendingLabel="Inscrevendo aluno…">
                            Confirmar inscrição
                          </FormSubmitButton>
                        </form>
                      </ResponsiveDialog>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">Resumo do exame</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Taxa padrão</dt>
                <dd className="font-medium tabular-nums">{formatBrl(bundle.event.default_fee_cents)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Arrecadação prevista</dt>
                <dd className="font-medium tabular-nums">{formatBrl(bundle.participants.reduce((sum, p) => sum + p.participant.fee_cents, 0))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Aprovados</dt>
                <dd className="font-medium tabular-nums">{approvedCount} de {bundle.participants.length}</dd>
              </div>
            </dl>

            {!eventClosed ? (
              <details className="group mt-3 border-t border-border pt-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                  Mais ações
                  <ChevronDown className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Cancelar o exame encerra as inscrições. Trate antes cada inscrição ativa.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="min-h-11 w-full text-destructive">
                        Cancelar este exame
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar {bundle.event.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O evento será marcado como cancelado e não receberá novas inscrições. {bundle.participants.length} {bundle.participants.length === 1 ? "candidato inscrito precisa" : "candidatos inscritos precisam"} ser tratados individualmente.
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
                </div>
              </details>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ExamSectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <CardGridSkeleton count={3} columns={1} />
      </div>
      <div className="lg:col-span-4 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <ListItemsSkeleton count={4} />
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
    ? "Aluno inscrito na banca e cobrança gerada com sucesso."
    : query.graded
      ? "Resultado registrado e graduação atualizada."
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminExams}
      title={event.name}
      subtitle={`${formatExamDate(event.event_date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · ${event.location || "Local não informado"}`}
      headerActions={<StatusBadge tone={eventTones[event.status]}>{eventLabels[event.status]}</StatusBadge>}
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
                : query.error === "participant"
                  ? "Verifique se o aluno possui matrícula ativa e a graduação pretendida é a imediatamente seguinte."
                  : "Confira os dados enviados e tente novamente."
            }
            clearParams={["error"]}
          />
        ) : null}

        {/* Seções em Layout Assimétrico de 2 Colunas */}
        <Suspense fallback={<ExamSectionsSkeleton />}>
          <ExamBundleSections eventId={eventId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
