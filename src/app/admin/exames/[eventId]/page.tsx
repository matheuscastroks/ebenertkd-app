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
import { Skeleton } from "@/components/ui/skeleton";
import { CardGridSkeleton, ListItemsSkeleton } from "@/components/skeletons";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";
import { getExamEvent, getExamEventBundle } from "@/features/exams/service";
import { beltForGub, type GubOption } from "@/features/students/options";
import { centsToReaisInput, formatBrl } from "@/lib/money";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  Info,
  MapPin,
  MinusCircle,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const eventLabels = {
  planned: "Planejado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
} as const;

const eventTones = {
  planned: "neutral",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
} as const;

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ======================================================== */}
      {/* COLUNA PRINCIPAL (65% / 8 de 12 colunas): MESA DA BANCA  */}
      {/* ======================================================== */}
      <div className="lg:col-span-8 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Mesa de Avaliação da Banca
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {bundle.participants.length} {bundle.participants.length === 1 ? "candidato" : "candidatos"}
              </span>
              {registeredCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {registeredCount} pendente{registeredCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Candidatos agrupados por graduação pretendida. Avalie cada praticante em 1 toque na mesa de exame.
          </p>
        </div>

        {bundle.participants.length === 0 ? (
          <Card className="depth-raised rounded-2xl border-border/80">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="size-12 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground text-base">
                Nenhum participante inscrito na banca ainda
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Utilize o painel lateral à direita para inscrever os alunos elegíveis neste exame de graduação.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <div key={group.targetGub} className="space-y-3">
                {/* Cabeçalho do Grupo de Faixa-Alvo */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <BeltProgressionPill
                      belt={group.targetBelt}
                      gub={group.targetGub}
                      size="sm"
                    />
                    <h3 className="text-sm font-bold text-foreground">
                      Candidatos a Faixa {group.targetBelt} ({group.targetGub === 0 ? "1º Dan" : `${group.targetGub}º GUB`})
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
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
                        <Card
                          key={participant.$id}
                          className={cn(
                            "depth-raised rounded-2xl border-border/80 transition-all",
                            isApproved && "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20",
                            isFailed && "bg-rose-500/5 border-rose-500/30 dark:bg-rose-950/20",
                            isAbsent && "bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/20"
                          )}
                        >
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
                                  <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
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
                            {isRegistered && bundle.event.status !== "completed" && bundle.event.status !== "cancelled" ? (
                              <div className="pt-2 border-t border-border/50">
                                <form
                                  action={recordExamResultAction}
                                  className="rounded-xl bg-muted/30 dark:bg-muted/15 border border-border/60 p-3.5 space-y-3"
                                >
                                  <input type="hidden" name="participant_id" value={participant.$id} />
                                  <input type="hidden" name="event_id" value={eventId} />

                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor={`notes-${participant.$id}`}
                                      className="text-xs font-semibold text-muted-foreground"
                                    >
                                      Parecer / Feedback técnico da banca (opcional)
                                    </label>
                                    <Input
                                      id={`notes-${participant.$id}`}
                                      name="notes"
                                      placeholder="Ex.: Ótima postura nos chutes, lapidar o Poomsae Taegeuk..."
                                      className="h-9 text-xs bg-background"
                                    />
                                  </div>

                                  {/* Botões de Ação Ergonômica de 1 Toque */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-2">
                                      <FormSubmitButton
                                        name="result"
                                        value="approved"
                                        className="h-9 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                        pendingLabel="Aprovando…"
                                      >
                                        <CheckCircle2 className="mr-1.5 size-3.5" />
                                        Aprovar aluno
                                      </FormSubmitButton>

                                      <FormSubmitButton
                                        name="result"
                                        value="failed"
                                        variant="outline"
                                        className="h-9 px-3 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-semibold"
                                        pendingLabel="Reprovando…"
                                      >
                                        <XCircle className="mr-1.5 size-3.5" />
                                        Reprovar
                                      </FormSubmitButton>

                                      <FormSubmitButton
                                        name="result"
                                        value="absent"
                                        variant="ghost"
                                        className="h-9 px-2.5 text-xs text-muted-foreground hover:bg-muted font-medium"
                                        pendingLabel="Marcando…"
                                      >
                                        <MinusCircle className="mr-1.5 size-3.5" />
                                        Ausente
                                      </FormSubmitButton>
                                    </div>

                                    {/* Cancelar Inscrição */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10 text-xs h-8 px-2"
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
                                              <FieldLabel className="text-xs font-semibold">
                                                Tratamento do valor quitado
                                              </FieldLabel>
                                              <select
                                                name="financial_decision"
                                                defaultValue="keep_charge"
                                                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                </form>
                              </div>
                            ) : (
                              /* Resultado Já Homologado */
                              <div
                                className={cn(
                                  "rounded-xl border p-3 space-y-1 text-xs",
                                  isApproved && "border-emerald-300/60 bg-emerald-50/50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200",
                                  isFailed && "border-rose-300/60 bg-rose-50/50 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-200",
                                  isAbsent && "border-amber-300/60 bg-amber-50/50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
                                )}
                              >
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    {isApproved && <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />}
                                    {isFailed && <XCircle className="size-4 text-rose-600 dark:text-rose-400" />}
                                    {isAbsent && <MinusCircle className="size-4 text-amber-600 dark:text-amber-400" />}
                                    Parecer da banca: {participantLabels[participant.status]}
                                  </span>
                                  {isApproved && (
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                      Graduação Homologada
                                    </span>
                                  )}
                                </div>
                                {participant.result_notes ? (
                                  <p className="italic text-foreground/80 pt-0.5">
                                    &ldquo;{participant.result_notes}&rdquo;
                                  </p>
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
      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
        {/* Card 1: Alunos Elegíveis para Inscrição */}
        <Card className="depth-raised rounded-2xl border-border/80">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-primary" />
                <CardTitle className="text-base font-bold">Alunos elegíveis</CardTitle>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {bundle.eligibleStudents.length} aptos
              </span>
            </div>
            <CardDescription className="text-xs">
              Praticantes com matrícula ativa e próxima graduação disponível para exame.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2.5">
            {bundle.eligibleStudents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                Todos os alunos elegíveis já foram inscritos neste exame.
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto space-y-2.5 pr-1">
                {bundle.eligibleStudents.map(({ student, photoDocumentId }) => {
                  const targetGub = (student!.gub! - 1) as GubOption;
                  const targetBelt = beltForGub(targetGub)!;

                  return (
                    <div
                      key={student!.$id}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2.5 hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar
                          name={student!.full_name}
                          photoDocumentId={photoDocumentId}
                          className="size-8"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-xs text-foreground">
                            {student!.full_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            ➔ Faixa {targetBelt}
                          </p>
                        </div>
                      </div>

                      <ResponsiveDialog
                        trigger={
                          <Button
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold shrink-0"
                            disabled={
                              bundle.event.status === "cancelled" ||
                              bundle.event.status === "completed"
                            }
                          >
                            Inscrever
                          </Button>
                        }
                        title={`Inscrever ${student!.full_name}`}
                        description="A confirmação registra a inscrição na banca e cria automaticamente uma cobrança individual no financeiro do aluno."
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
                              Será registrada como uma cobrança individual com vencimento na data do exame.
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Resumo e Informações do Evento */}
        <Card className="depth-raised rounded-2xl border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="size-4 text-primary" />
              Dados do Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Status do evento:</span>
              <StatusBadge tone={eventTones[bundle.event.status]}>
                {eventLabels[bundle.event.status]}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Taxa padrão:</span>
              <span className="font-bold font-mono text-foreground">
                {formatBrl(bundle.event.default_fee_cents)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Arrecadação prevista:</span>
              <span className="font-bold font-mono text-foreground">
                {formatBrl(
                  bundle.participants.reduce((sum, p) => sum + p.participant.fee_cents, 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Alunos homologados:</span>
              <span className="font-semibold text-foreground">
                {approvedCount} de {bundle.participants.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Ações Administrativas Gerais */}
        {!["completed", "cancelled"].includes(bundle.event.status) && (
          <Card className="border-destructive/20 bg-destructive/5 rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <ShieldAlert className="size-4" />
                <span>Zona Administrativa</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deseja cancelar este exame de graduação? Inscrições ativas devem ser tratadas individualmente.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full h-9 text-xs font-semibold mt-1"
                  >
                    Cancelar este exame
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
            </CardContent>
          </Card>
        )}
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
      ? "Resultado registrado com sucesso e graduação atualizada!"
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminExams}
      title={event.name}
      subtitle="Gerencie a mesa da banca examinadora, avaliações tácteis de graduação e taxas individuais."
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

        {/* Resumo Proeminente do Evento (Topo) */}
        <Card className="depth-raised rounded-2xl border-border/80 overflow-hidden bg-gradient-to-r from-card via-card to-muted/20">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Award className="size-5" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground truncate">
                    {event.name}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5 capitalize">
                    <Calendar className="size-3.5 shrink-0 text-muted-foreground/70" />
                    {new Date(event.event_date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{event.location ?? "Dojang Central Ebener TKD"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="size-3.5 shrink-0 text-muted-foreground/70" />
                    Taxa base: <strong className="font-mono text-foreground">{formatBrl(event.default_fee_cents)}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <StatusBadge tone={eventTones[event.status]}>
                  {eventLabels[event.status]}
                </StatusBadge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seções em Layout Assimétrico de 2 Colunas */}
        <Suspense fallback={<ExamSectionsSkeleton />}>
          <ExamBundleSections eventId={eventId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
