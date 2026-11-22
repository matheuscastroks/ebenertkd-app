import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown } from "@/components/ui/icons";
import { cancelExamEventAction, cancelExamParticipantAction } from "@/app/actions/exams";
import { AvatarGroup } from "@/components/shared/avatar-group";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlusIcon } from "@/components/ui/user-plus";
import { ExamResultActions } from "@/features/billing/components/exam-result-actions";
import { EnrollParticipantForm } from "@/features/exams/components/enroll-participant-form";
import { examParticipantLabels, examParticipantTones } from "@/features/exams/labels";
import { examTargetRanks, toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { isRankKey, rankOrder, rankShortLabel } from "@/features/academy/ranks";
import { getExamEventBundle } from "@/features/exams/service";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { studentPhotoUrl } from "@/features/students/photo-url";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";

/** Mesa da banca: candidatos e resultados, inscrição de alunos e cancelamento do exame. */
export async function ExamBundleSections({ eventId }: { eventId: string }) {
  const [bundle, ranks, beltPolicy, examPolicy] = await Promise.all([getExamEventBundle(eventId), getBeltRanks(), getPolicy("belts"), getPolicy("exam")]);
  const levelLabel = beltPolicy.level_label;
  const publicRanks = ranks.map(toPublicRank);
  // Só entra na lista quem ainda tem alguma graduação habilitada acima da atual.
  const eligibleStudents = bundle.eligibleStudents.filter(
    ({ student }) => examTargetRanks(publicRanks, student?.rank_key, examPolicy.allow_skip_grades).length > 0
  );
  const rankFees = Object.fromEntries(
    ranks.flatMap((rank) => (rank.exam_fee_cents != null ? [[rank.rank_key, centsToReaisInput(rank.exam_fee_cents)]] : []))
  );

  const activeParticipants = bundle.participants.filter(
    (row) => row.participant.status !== "cancelled"
  );
  const cancelledParticipants = bundle.participants.filter(
    (row) => row.participant.status === "cancelled"
  );

  // Agrupa os candidatos pela graduação pretendida, na ordem de progressão do catálogo.
  const groupsMap = new Map<
    string,
    {
      targetRankKey: string;
      participants: typeof activeParticipants;
    }
  >();

  for (const row of activeParticipants) {
    const key = row.participant.target_rank_key;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { targetRankKey: key, participants: [] });
    }
    groupsMap.get(key)!.participants.push(row);
  }

  const orderOf = (key: string) => (isRankKey(key) ? rankOrder(key) : Number.MAX_SAFE_INTEGER);
  const sortedGroups = Array.from(groupsMap.values())
    .sort((a, b) => orderOf(a.targetRankKey) - orderOf(b.targetRankKey))
    .map((group) => ({
      ...group,
      participants: [...group.participants].sort((a, b) => {
        const aPending = a.participant.status === "registered" ? 0 : 1;
        const bPending = b.participant.status === "registered" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return a.student!.full_name.localeCompare(b.student!.full_name, "pt-BR");
      }),
    }));

  const registeredCount = activeParticipants.filter(
    (row) => row.participant.status === "registered"
  ).length;
  const approvedCount = activeParticipants.filter(
    (row) => row.participant.status === "approved"
  ).length;
  const projectedRevenueCents = activeParticipants.reduce(
    (sum, row) => sum + row.participant.fee_cents,
    0
  );
  const eventClosed =
    bundle.event.status === "completed" || bundle.event.status === "cancelled";
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  const examDateReached = bundle.event.event_date.slice(0, 10) <= today;

  return (
    <div className="space-y-6">
      <dl
        aria-label="Indicadores da banca"
        className="grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-xs sm:grid-cols-4"
      >
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Inscritos</dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {activeParticipants.length}
          </dd>
          <div className="mt-1.5">
            <AvatarGroup
              people={activeParticipants.map(({ student, photoDocumentId }) => ({ name: student!.full_name, imageUrl: studentPhotoUrl(photoDocumentId) }))}
              max={5}
              size="sm"
              surface="card"
              label="Candidatos inscritos"
            />
          </div>
        </div>
        <div className="border-l border-border p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Aguardando nota</dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {registeredCount}
          </dd>
        </div>
        <div className="border-t border-border p-4 sm:border-t-0 sm:border-l sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Aprovados</dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {approvedCount}
          </dd>
        </div>
        <div className="border-t border-l border-border p-4 sm:border-t-0 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Arrecadação prevista</dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatBrl(projectedRevenueCents)}
          </dd>
        </div>
      </dl>

      {bundle.event.status === "completed" ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 shadow-xs sm:px-5"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Banca encerrada: resultados registrados e faixas atualizadas.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Mesa da banca</h2>
            <p className="text-sm text-muted-foreground">
              {activeParticipants.length === 0
                ? "Sem candidatos ativos"
                : registeredCount > 0
                  ? `${registeredCount} ${registeredCount === 1 ? "candidato sem resultado" : "candidatos sem resultado"}`
                  : "Todos os candidatos avaliados"}
            </p>
          </div>

          {activeParticipants.length === 0 ? (
            <EmptyState
              title="Nenhum candidato inscrito"
              description="Use Inscrever alunos, ao lado (abaixo, no celular)."
            />
          ) : (
            <div className="space-y-6">
              {sortedGroups.map((group) => (
                <section key={group.targetRankKey} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span>Para</span>
                      <BeltBadge rankKey={group.targetRankKey} size="sm" />
                    </h3>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {group.participants.length}{" "}
                      {group.participants.length === 1 ? "aluno" : "alunos"}
                    </span>
                  </div>

                  <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
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
                          <li
                            key={participant.$id}
                            className="t-interactive-row flex flex-col gap-3 px-4 py-3.5 hover:bg-muted sm:px-5"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                              <StudentAvatar
                                name={student!.full_name} sex={student!.sex}
                                photoDocumentId={photoDocumentId}
                                size="sm"
                                className="mt-0.5 shrink-0 sm:mt-0"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="min-w-0 text-sm font-medium text-foreground">
                                    {student!.full_name}
                                  </p>
                                  {charge ? (
                                    <StatusBadge tone={paidLike ? "success" : "warning"}>
                                      {charge.status === "paid"
                                        ? "Taxa quitada"
                                        : charge.status === "proof_under_review"
                                          ? "Comprovante enviado"
                                          : "Taxa em aberto"}
                                    </StatusBadge>
                                  ) : participant.fee_cents === 0 ? (
                                    <span className="text-sm text-muted-foreground">
                                      Isento de taxa
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                                  <span className="shrink-0">Atual:</span>
                                  <BeltBadge rankKey={student!.rank_key} size="sm" />
                                </div>
                                {participant.result_notes ? (
                                  <p className="text-sm text-muted-foreground">
                                    Parecer: {participant.result_notes}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {isRegistered && !eventClosed ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 sm:justify-end">
                                {examDateReached ? (
                                  <ExamResultActions
                                    participantId={participant.$id}
                                    eventId={eventId}
                                    name={student!.full_name}
                                    currentRankKey={student!.rank_key}
                                    targetRankKey={participant.target_rank_key}
                                    currentName={
                                      isRankKey(student!.rank_key)
                                        ? rankShortLabel(student!.rank_key, levelLabel)
                                        : "Sem graduação"
                                    }
                                    targetName={
                                      isRankKey(participant.target_rank_key)
                                        ? rankShortLabel(participant.target_rank_key, levelLabel)
                                        : participant.target_rank_key
                                    }
                                    feeCents={
                                      charge?.amount_cents ?? bundle.event.default_fee_cents
                                    }
                                  />
                                ) : (
                                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                    Avaliação no dia do exame
                                  </span>
                                )}
                                {paidLike ? (
                                  <ResponsiveDialog
                                    trigger={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-11 px-2.5 text-sm text-muted-foreground hover:text-destructive sm:h-9"
                                        aria-label={`Cancelar inscrição de ${student!.full_name}`}
                                      >
                                        Cancelar inscrição
                                      </Button>
                                    }
                                    title={`Cancelar inscrição de ${student!.full_name}?`}
                                    description={
                                      charge?.status === "proof_under_review"
                                        ? "Há um comprovante em análise para esta taxa. Escolha se deseja manter o valor como taxa administrativa ou conceder crédito futuro."
                                        : "A taxa já consta como quitada. Escolha se deseja manter o valor arrecadado como taxa administrativa ou conceder crédito futuro."
                                    }
                                  >
                                    <form
                                      action={cancelExamParticipantAction}
                                      className="space-y-4 pt-2"
                                    >
                                      <input
                                        type="hidden"
                                        name="participant_id"
                                        value={participant.$id}
                                      />
                                      <input type="hidden" name="event_id" value={eventId} />

                                      <dl className="grid grid-cols-1 gap-2 border-b border-border pb-4 text-sm">
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <dt className="text-muted-foreground">Aluno</dt>
                                          <dd className="font-medium text-foreground">
                                            {student!.full_name}
                                          </dd>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <dt className="text-muted-foreground">
                                            Graduação pretendida
                                          </dt>
                                          <dd className="font-medium text-foreground">
                                            <BeltBadge rankKey={participant.target_rank_key} size="sm" />
                                          </dd>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <dt className="text-muted-foreground">Taxa do exame</dt>
                                          <dd className="font-medium tabular-nums text-foreground">
                                            {formatBrl(
                                              charge?.amount_cents ?? participant.fee_cents
                                            )}
                                          </dd>
                                        </div>
                                      </dl>

                                      <Field>
                                        <FieldLabel htmlFor={`financial-decision-${participant.$id}`}>
                                          Tratamento do valor quitado
                                        </FieldLabel>
                                        <Select
                                          name="financial_decision"
                                          defaultValue={examPolicy.absent_default_decision ?? "keep_charge"}
                                        >
                                          <SelectTrigger
                                            id={`financial-decision-${participant.$id}`}
                                            className="min-h-11 w-full"
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="keep_charge">
                                              Manter valor arrecadado (taxa administrativa)
                                            </SelectItem>
                                            <SelectItem value="future_credit">
                                              Conceder crédito para o próximo exame
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </Field>

                                      <FormSubmitButton
                                        variant="destructive"
                                        className="min-h-11 w-full"
                                        pendingLabel="Cancelando inscrição…"
                                      >
                                        Confirmar cancelamento da inscrição
                                      </FormSubmitButton>
                                    </form>
                                  </ResponsiveDialog>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-11 px-2.5 text-sm text-muted-foreground hover:text-destructive sm:h-9"
                                        aria-label={`Cancelar inscrição de ${student!.full_name}`}
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
                                          {charge
                                            ? "A taxa individual em aberto será automaticamente cancelada no financeiro do aluno."
                                            : "A inscrição será removida da lista de candidatos ativos desta banca."}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <form action={cancelExamParticipantAction}>
                                        <input
                                          type="hidden"
                                          name="participant_id"
                                          value={participant.$id}
                                        />
                                        <input type="hidden" name="event_id" value={eventId} />
                                        <AlertDialogFooter>
                                          <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                                          <AlertDialogAction type="submit" variant="destructive">
                                            Confirmar cancelamento da inscrição
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </form>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                                <StatusBadge tone={examParticipantTones[participant.status]}>
                                  {examParticipantLabels[participant.status]}
                                </StatusBadge>
                                {isApproved ? (
                                  <span className="text-sm text-muted-foreground">
                                    Graduação registrada
                                  </span>
                                ) : isFailed || isAbsent ? (
                                  <span className="text-sm text-muted-foreground">
                                    Faixa mantida
                                  </span>
                                ) : null}
                                {participant.graded_at ? (
                                  <span className="text-sm tabular-nums text-muted-foreground">
                                    ·{" "}
                                    {new Date(participant.graded_at).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "short",
                                      timeZone: "America/Sao_Paulo",
                                    })}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </li>
                        );
                      }
                    )}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {cancelledParticipants.length > 0 ? (
            <details className="group space-y-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                Inscrições canceladas ({cancelledParticipants.length})
              </summary>
              <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
                {cancelledParticipants.map(({ participant, student, photoDocumentId }) => (
                  <li
                    key={participant.$id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StudentAvatar
                        name={student!.full_name} sex={student!.sex}
                        photoDocumentId={photoDocumentId}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student!.full_name}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                          <span>Para</span>
                          <BeltBadge rankKey={participant.target_rank_key} size="sm" />
                          {participant.financial_decision === "future_credit"
                            ? <span>· Crédito para próximo exame</span>
                            : participant.financial_decision === "keep_charge"
                              ? <span>· Valor mantido</span>
                              : null}
                        </div>
                      </div>
                    </div>
                    <StatusBadge tone="neutral">Cancelado</StatusBadge>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {!eventClosed ? (
            <details className="group border-t border-border pt-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                Cancelar exame
                <ChevronDown
                  className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Encerra as inscrições. Trate antes cada inscrição em aberto.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="min-h-11 shrink-0 text-destructive">
                      Cancelar este exame
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar {bundle.event.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {registeredCount > 0
                          ? `O evento será marcado como cancelado e não receberá novas inscrições. ${registeredCount} ${registeredCount === 1 ? "candidato inscrito ainda precisa" : "candidatos inscritos ainda precisam"} ser tratados antes.`
                          : "O evento será marcado como cancelado e não receberá novas inscrições."}
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
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Inscrever alunos</CardTitle>
              <CardDescription>
                {eventClosed
                  ? "Inscrições encerradas."
                  : `${eligibleStudents.length} ${eligibleStudents.length === 1 ? "aluno ativo pode" : "alunos ativos podem"} subir de faixa. Taxa padrão ${formatBrl(bundle.event.default_fee_cents)}.`}
              </CardDescription>
              <Link
                href={`${ROUTES.adminExamEligibility}?status=eligible`}
                className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver quem cumpriu tempo e presenças
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>

            <CardContent className="pt-0">
              {eligibleStudents.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Todos os alunos ativos já estão nesta banca.
                </p>
              ) : (
                <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                  {eligibleStudents.map(({ student, photoDocumentId }) => (
                    <li key={student!.$id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <StudentAvatar
                            name={student!.full_name} sex={student!.sex}
                            photoDocumentId={photoDocumentId}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium text-foreground">
                              {student!.full_name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>Atual:</span>
                              <BeltBadge rankKey={student!.rank_key} size="sm" />
                            </div>
                          </div>
                        </div>

                        <ResponsiveDialog
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-11 shrink-0 px-3 sm:h-9"
                              disabled={eventClosed}
                            >
                              <UserPlusIcon className="size-3.5" aria-hidden="true" />
                              Inscrever
                            </Button>
                          }
                          title={`Inscrever ${student!.full_name}`}
                          description="Escolha a graduação pretendida e confirme a cobrança individual no financeiro do aluno."
                        >
                          <EnrollParticipantForm
                            eventId={eventId}
                            studentId={student!.$id}
                            currentRankKey={student!.rank_key}
                            allowSkipGrades={examPolicy.allow_skip_grades}
                            defaultFeeReais={centsToReaisInput(
                              bundle.event.default_fee_cents
                            )}
                            rankFeesReais={rankFees}
                          />
                        </ResponsiveDialog>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </aside>
      </div>
    </div>
  );
}
