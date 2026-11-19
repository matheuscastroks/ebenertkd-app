import Link from "next/link";
import {
  advanceToSignatureAction,
  reviewDocumentAction,
  saveFinancialReviewAction,
  setAccessOverrideAction
} from "@/app/actions/enrollment-review";
import { renewContractAction } from "@/app/actions/renewals";
import { DateField } from "@/components/shared/date-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckIcon } from "@/components/ui/check";
import { FilePenLineIcon } from "@/components/ui/file-pen-line";
import { SheetClose } from "@/components/ui/sheet";
import { XIcon } from "@/components/ui/x";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { EditStudentDialog } from "@/features/students/components/edit-student-dialog";
import type { TrainingClass } from "@/features/classes/types";
import { useBeltLabels, useBeltRanks, useDueDayOptions } from "@/components/academy-config-provider";
import { DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";
import {
  accessStatusLabel,
  type StudentAppAccessState,
  type StudentAppAccessStatus
} from "@/features/billing/access-lock-rules";
import {
  PARQ_STATUS_LABELS,
  type ParqAssessment,
  type ParqStatus
} from "@/features/students/parq-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import { calculateDefaultContractDates, calculateNextDueDate } from "@/features/students/options";
import { rankFullLabel } from "@/features/academy/belt-rules";
import type { EnrollmentBundle } from "@/features/students/types";
import { centsToReaisInput } from "@/lib/money";
import { formatBrazilianPhone } from "@/lib/phone";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  FileText,
  HeartPulse,
  ImageIcon,
  Phone,
  ShieldCheck,
  Users,
  Wallet
} from "@/components/ui/icons";

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";

const enrollmentStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  under_review: "Em análise",
  awaiting_signature: "Aguardando assinatura",
  active: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
  awaiting_renewal: "Aguardando renovação"
};

const parqToneMap: Record<ParqStatus, "success" | "warning" | "danger"> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
  missing: "warning"
};

const accessToneMap: Record<StudentAppAccessStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  not_applicable: "neutral",
  active: "success",
  expiring_soon: "warning",
  proof_under_review: "info",
  override: "info",
  locked: "danger"
};

export function ReviewPanel({
  bundle,
  reviews,
  classes = [],
  parqAssessment,
  accessState,
  notice,
  defaultMonthlyFeeCents = DEFAULT_BILLING_POLICY.default_monthly_fee_cents,
  contractDurationMonths = DEFAULT_CONTRACT_POLICY.default_duration_months
}: {
  bundle: EnrollmentBundle;
  reviews: Array<Record<string, unknown>>;
  classes?: TrainingClass[];
  parqAssessment?: ParqAssessment;
  accessState?: StudentAppAccessState;
  notice?: string;
  /** Mensalidade sugerida na aprovação (política da academia). */
  defaultMonthlyFeeCents?: number;
  /** Duração sugerida do contrato, em meses (política da academia). */
  contractDurationMonths?: number;
}) {
  const dueDayOptions = useDueDayOptions();
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const { student, enrollment, documents } = bundle;
  const rankLabel = rankFullLabel(ranks, student.rank_key, levelLabel);
  const profilePhoto = documents.find((doc) => doc.document_type === "profile_photo");
  const medicalCertificate = documents.find((doc) => doc.document_type === "medical_certificate");

  const dueDay = enrollment.approved_due_day ?? enrollment.requested_due_day ?? 10;
  const defaultFirstDueDate = enrollment.first_due_date
    ? dateValue(enrollment.first_due_date)
    : calculateNextDueDate(dueDay);
  const contractDates = calculateDefaultContractDates(
    enrollment.contract_start,
    enrollment.contract_end,
    undefined,
    contractDurationMonths
  );

  const isPhotoUploaded = Boolean(profilePhoto);
  const isMedApproved = medicalCertificate?.status === "approved";

  return (
    <div className="space-y-6">
      {/* 1. Cabeçalho do Aluno com Avatar e Status Geral */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <StudentAvatar
            name={student.full_name}
            photoDocumentId={profilePhoto?.$id}
            size="lg"
          />
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              {student.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              CPF {student.cpf || "não informado"} · {rankLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            tone={
              enrollment.status === "active"
                ? "success"
                : enrollment.status === "cancelled"
                  ? "danger"
                  : enrollment.status === "under_review"
                    ? "warning"
                    : "info"
            }
          >
            {enrollmentStatusLabels[enrollment.status] ?? enrollment.status}
          </StatusBadge>
          <EditStudentDialog student={student} classes={classes} />
        </div>
      </div>

      {notice ? (
        <OperationToast
          tone={notice.includes("Não") || notice.includes("erro") ? "error" : "success"}
          title={notice}
          clearParams={["updated", "error"]}
        />
      ) : null}

      {/* 2. Abas de Gestão da Ficha de Matrícula (Padrão Apple HIG) */}
      <Tabs defaultValue="cadastro" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/80 p-1 sm:grid-cols-5">
          <TabsTrigger value="cadastro" className="min-h-11 rounded-lg text-xs sm:text-sm font-medium">
            <Phone className="mr-1.5 size-3.5 hidden sm:inline-block" aria-hidden="true" />
            Cadastro & Contato
          </TabsTrigger>
          <TabsTrigger value="saude" className="min-h-11 rounded-lg text-xs sm:text-sm font-medium">
            <HeartPulse className="mr-1.5 size-3.5 hidden sm:inline-block" aria-hidden="true" />
            Saúde & PAR-Q
          </TabsTrigger>
          <TabsTrigger value="treino" className="min-h-11 rounded-lg text-xs sm:text-sm font-medium">
            <Award className="mr-1.5 size-3.5 hidden sm:inline-block" aria-hidden="true" />
            Treino & Acesso
          </TabsTrigger>
          <TabsTrigger value="documentos" className="min-h-11 rounded-lg text-xs sm:text-sm font-medium">
            <FileText className="mr-1.5 size-3.5 hidden sm:inline-block" aria-hidden="true" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="contrato" className="min-h-11 col-span-2 sm:col-span-1 rounded-lg text-xs sm:text-sm font-medium">
            <Wallet className="mr-1.5 size-3.5 hidden sm:inline-block" aria-hidden="true" />
            Contrato & Financeiro
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Cadastro & Contato */}
        <TabsContent value="cadastro" className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Identificação e Contato</h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Dados pessoais e canais de comunicação direta com o aluno ou responsáveis.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Data de Nascimento</span>
                  <span className="font-medium text-foreground">
                    {dateValue(student.birth_date)
                      ? new Date(`${dateValue(student.birth_date)}T12:00:00`).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">WhatsApp</span>
                  <span className="font-medium text-foreground">
                    {formatBrazilianPhone(student.whatsapp) || "—"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Contato do Responsável</span>
                  <span className="font-medium text-foreground">{student.guardian_contact || "Não informado / próprio aluno"}</span>
                </div>
                <div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                  <span className="text-xs text-muted-foreground block">Endereço Residencial</span>
                  <span className="font-medium text-foreground">{student.address || "—"}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="size-4 text-muted-foreground" aria-hidden="true" /> Contato de Emergência
              </h3>
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Nome</span>
                  <span className="font-medium text-foreground">{student.emergency_contact_name || "—"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Parentesco / Relação</span>
                  <span className="font-medium text-foreground">{student.emergency_contact_relationship || "—"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Telefone de Emergência</span>
                  <span className="font-medium text-foreground">
                    {formatBrazilianPhone(student.emergency_contact_phone) || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: Saúde & PAR-Q */}
        <TabsContent value="saude" className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Cuidados de Saúde Declarados</h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Informações fornecidas na ficha de matrícula para segurança nos treinos.
                  </p>
                </div>
                {student.health_condition === "yes" ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    Condição informada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-success border-success/30 bg-success/10">
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    Sem restrições
                  </Badge>
                )}
              </div>

              {student.health_condition === "yes" ? (
                <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
                  {student.health_details ? (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Detalhes da condição</span>
                      <p className="font-medium text-foreground mt-0.5">{student.health_details}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-3 pt-1">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Medicamentos</span>
                      <span className="text-foreground">{student.medications || "Nenhum informado"}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Alergias</span>
                      <span className="text-foreground">{student.allergies || "Nenhuma informada"}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Lesões ou Restrições</span>
                      <span className="text-foreground">{student.injuries || "Nenhuma informada"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  O aluno declarou não possuir condições crônicas ou restrições especiais na ficha de cadastro.
                </p>
              )}
            </div>

            {/* Questionário PAR-Q */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Questionário PAR-Q Anual (CREF1)</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Questionário de prontidão para atividade física com validade de 12 meses.
                  </p>
                </div>
                {parqAssessment ? (
                  <StatusBadge tone={parqToneMap[parqAssessment.status]}>
                    {PARQ_STATUS_LABELS[parqAssessment.status]}
                  </StatusBadge>
                ) : null}
              </div>

              {parqAssessment && parqAssessment.signedAt ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">Assinado em</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatBusinessDateBr(parqAssessment.signedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Válido até</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatBusinessDateBr(parqAssessment.expiresAt)}
                        {parqAssessment.daysUntilExpiration != null
                          ? parqAssessment.daysUntilExpiration < 0
                            ? ` (vencido)`
                            : ` (restam ${parqAssessment.daysUntilExpiration} dias)`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Assinado por</span>
                      <span className="font-medium text-foreground">
                        {parqAssessment.signerName || "—"}
                      </span>
                    </div>
                  </div>

                  {parqAssessment.hasYesAnswer ? (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>
                        Respondeu <strong>&quot;Sim&quot;</strong> nas perguntas{" "}
                        <span className="font-semibold tabular-nums">
                          {parqAssessment.yesQuestionNumbers.join(", ")}
                        </span>
                        . Requer atenção e validação de atestado médico.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden="true" />
                      <span>Todas as 10 perguntas respondidas com &quot;Não&quot;.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Questionário anual de prontidão física ainda não preenchido.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ABA 3: Treino & Acesso */}
        <TabsContent value="treino" className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            <div className="p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Taekwondo e Graduação</h2>
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Turma Escolhida</span>
                  <span className="font-medium text-foreground">{student.training_class || "—"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Graduação Atual</span>
                  <span className="font-medium text-foreground">
                    {student.rank_key ? rankLabel : "—"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block">Início no Taekwondo</span>
                  <span className="font-medium text-foreground">
                    {dateValue(student.started_at_tkd)
                      ? new Date(`${dateValue(student.started_at_tkd)}T12:00:00`).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ciclo mensal de acesso ao app */}
            {accessState ? (
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Ciclo Mensal de Acesso ao App</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                      O aplicativo fecha automaticamente 30 dias após o último pagamento confirmado, salvo liberação manual.
                    </p>
                  </div>
                  <StatusBadge tone={accessToneMap[accessState.status]}>
                    {accessStatusLabel(accessState)}
                  </StatusBadge>
                </div>

                <dl className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Último pagamento</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                      {accessState.lastPaidAt ? formatBusinessDateBr(accessState.lastPaidAt) : "Sem registro"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Acesso válido até</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                      {accessState.accessValidUntil ? formatBusinessDateBr(accessState.accessValidUntil) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Liberação manual</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                      {accessState.overrideUntil ? formatBusinessDateBr(accessState.overrideUntil) : "Inativa"}
                    </dd>
                  </div>
                </dl>

                <form action={setAccessOverrideAction} className="space-y-3 pt-2">
                  <input type="hidden" name="student_id" value={student.$id} />
                  <DateField
                    id="access-override-until"
                    name="access_override_until"
                    label="Liberar acesso manualmente até (opcional)"
                    defaultValue={dateValue(enrollment.access_override_until)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <FormSubmitButton variant="outline" size="sm" className="min-h-10" pendingLabel="Salvando…">
                      Salvar liberação temporária
                    </FormSubmitButton>
                    {enrollment.access_override_until ? (
                      <FormSubmitButton
                        name="clear_override"
                        value="1"
                        variant="ghost"
                        size="sm"
                        className="min-h-10 text-destructive"
                        pendingLabel="Removendo…"
                      >
                        Remover liberação manual
                      </FormSubmitButton>
                    ) : null}
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ABA 4: Documentos */}
        <TabsContent value="documentos" className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            {/* Foto do Aluno */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Foto do Aluno (Identificação)</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Utilizada na carteirinha digital, chamadas e perfil do praticante.
                  </p>
                </div>
                {profilePhoto ? (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    Cadastrada
                  </Badge>
                ) : (
                  <Badge variant="destructive">Pendente</Badge>
                )}
              </div>
              {profilePhoto ? (
                <Attachment className="w-full">
                  <AttachmentMedia>
                    <ImageIcon aria-hidden="true" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {profilePhoto.original_name || "Foto de identificação"}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      Item cadastral do aluno
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction asChild size="sm" variant="outline">
                      <Link
                        href={`/api/student-documents/${profilePhoto.$id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink aria-hidden="true" />
                        Visualizar imagem original
                      </Link>
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma foto enviada até o momento.</p>
              )}
            </div>

            {/* Atestado Médico */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Atestado Médico</h3>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Requer aprovação formal da administração para liberação de contratos e treinos.
                  </p>
                </div>
                {medicalCertificate ? (
                  <StatusBadge
                    tone={
                      medicalCertificate.status === "approved"
                        ? "success"
                        : medicalCertificate.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {medicalCertificate.status === "approved"
                      ? "Aprovado"
                      : medicalCertificate.status === "rejected"
                        ? "Precisa de correção"
                        : "Aguardando análise"}
                  </StatusBadge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Não enviado
                  </Badge>
                )}
              </div>

              {medicalCertificate ? (
                <Attachment className="w-full">
                  <AttachmentMedia>
                    <FileText aria-hidden="true" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {medicalCertificate.original_name || "Atestado médico enviado"}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      {medicalCertificate.status === "approved"
                        ? "Validado pela administração"
                        : medicalCertificate.status === "rejected"
                          ? "Aguardando novo envio pelo aluno"
                          : "Aguardando conferência"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction asChild size="sm" variant="outline">
                      <Link
                        href={`/api/student-documents/${medicalCertificate.$id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink aria-hidden="true" />
                        Abrir documento
                      </Link>
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum atestado médico anexado.</p>
              )}

              {medicalCertificate && medicalCertificate.status !== "approved" ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <form action={reviewDocumentAction}>
                    <input type="hidden" name="student_id" value={student.$id} />
                    <input type="hidden" name="document_id" value={medicalCertificate.$id} />
                    <input type="hidden" name="decision" value="approved" />
                    <FormSubmitButton variant="outline" className="min-h-11" size="sm" pendingLabel="Aprovando…">
                      <CheckIcon aria-hidden="true" />
                      Aprovar atestado
                    </FormSubmitButton>
                  </form>

                  <ResponsiveDialog
                    trigger={
                      <Button className="min-h-11 text-destructive" variant="outline" size="sm">
                        <XIcon aria-hidden="true" />
                        Reprovar
                      </Button>
                    }
                    title="Reprovar atestado médico?"
                    description="Informe o motivo da reprovação para que o aluno ou responsável possa enviar um documento legível ou atualizado."
                  >
                    <form action={reviewDocumentAction} className="space-y-4 pt-2">
                      <input type="hidden" name="student_id" value={student.$id} />
                      <input type="hidden" name="document_id" value={medicalCertificate.$id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Field>
                        <FieldLabel htmlFor="document-reason">Motivo da reprovação</FieldLabel>
                        <Input
                          id="document-reason"
                          name="reason"
                          placeholder="Ex.: Imagem ilegível, sem CRM ou vencido"
                          className="h-11"
                          required
                        />
                      </Field>
                      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <SheetClose asChild>
                          <Button type="button" variant="outline" className="min-h-11">
                            Cancelar
                          </Button>
                        </SheetClose>
                        <FormSubmitButton
                          variant="destructive"
                          className="min-h-11"
                          pendingLabel="Reprovando…"
                        >
                          Confirmar reprovação
                        </FormSubmitButton>
                      </div>
                    </form>
                  </ResponsiveDialog>
                </div>
              ) : medicalCertificate?.status === "approved" ? (
                <p className="flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                  Atestado validado e arquivado com sucesso.
                </p>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* ABA 5: Contrato & Financeiro */}
        <TabsContent value="contrato" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Coluna 1: Condições Contratuais e Valores */}
            <div className="lg:col-span-7 overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
              <section className="p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Condições Financeiras e Contratuais</h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Valores, descontos e vigência do contrato. Ajuste e salve para atualizar os termos.
                  </p>
                </div>

                <form action={saveFinancialReviewAction} className="space-y-4">
                  <input type="hidden" name="student_id" value={student.$id} />

                  <div className="grid gap-3 sm:grid-cols-2 items-end">
                    <Field>
                      <FieldLabel htmlFor="review-monthly-fee">Mensalidade acordada (R$)</FieldLabel>
                      <Input
                        id="review-monthly-fee"
                        name="monthly_fee_reais"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Ex.: 150,00"
                        defaultValue={centsToReaisInput(enrollment.monthly_fee_cents ?? defaultMonthlyFeeCents)}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="review-discount">Desconto mensal (R$)</FieldLabel>
                      <Input
                        id="review-discount"
                        name="discount_reais"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        defaultValue={centsToReaisInput(enrollment.discount_cents ?? 0)}
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="review-due-day">Dia de vencimento aprovado</FieldLabel>
                    <Select name="approved_due_day" defaultValue={String(dueDay)} required>
                      <SelectTrigger id="review-due-day" className="w-full">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {(dueDayOptions.includes(dueDay) ? dueDayOptions : [...dueDayOptions, dueDay].sort((a, b) => a - b)).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            Dia {day} de cada mês
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Separator />

                  <div className="space-y-3">
                    <DateField
                      id="review-first-due"
                      name="first_due_date"
                      label="Primeiro vencimento"
                      defaultValue={defaultFirstDueDate}
                      required
                    />

                    <div className="grid gap-3 sm:grid-cols-2 items-end">
                      <DateField
                        id="review-contract-start"
                        name="contract_start"
                        label="Início do contrato"
                        defaultValue={contractDates.start}
                        required
                      />

                      <DateField
                        id="review-contract-end"
                        name="contract_end"
                        label="Fim do contrato (1 ano)"
                        defaultValue={contractDates.end}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <FormSubmitButton variant="outline" className="min-h-11 w-full" pendingLabel="Salvando condições…">
                    Salvar condições contratuais
                  </FormSubmitButton>
                </form>
              </section>

              {/* Histórico de Análises */}
              <section className="px-5 py-2">
                <Accordion type="single" collapsible>
                  <AccordionItem value="history" className="border-b-0">
                    <AccordionTrigger className="text-sm font-medium">
                      Histórico da análise ({reviews.length})
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      {reviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma análise registrada.</p>
                      ) : (
                        reviews.map((review) => (
                          <div key={String(review.$id)} className="border-l-2 pl-3 text-sm">
                            <p className="font-medium">{String(review.action).replaceAll("_", " ")}</p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(String(review.created_at)).toLocaleString("pt-BR")}
                              {review.notes ? ` · ${String(review.notes)}` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            </div>

            {/* Coluna 2: Emissão e Assinatura */}
            <div className="lg:col-span-5 overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
              {enrollment.status === "awaiting_renewal" ? (
                <section className="p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Renovar Contrato</h2>
                    <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                      Uma nova versão será emitida mantendo o histórico anterior preservado.
                    </p>
                  </div>

                  <form id="renew-contract-form" action={renewContractAction} className="space-y-3">
                    <input type="hidden" name="student_id" value={student.$id} />
                    <DateField
                      id="renewal-end"
                      name="ends_at"
                      label="Nova data final"
                      min={new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })}
                      required
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" className="min-h-11 w-full">
                          Emitir renovação
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Emitir renovação do contrato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Uma nova versão do contrato será emitida para assinatura de {student.full_name}, mantendo o histórico anterior preservado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                          <AlertDialogAction type="submit" form="renew-contract-form">
                            Emitir renovação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </form>
                </section>
              ) : (
                <section className="p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Concluir Análise e Emitir Contrato</h2>
                    <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                      A assinatura digital é liberada após conferência dos dados cadastrais e financeiros.
                    </p>
                  </div>

                  {/* Checklist de requisitos para liberar assinatura */}
                  <div className="divide-y divide-border border-y border-border py-1 text-sm">
                    <p className="py-1.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Checklist de Requisitos</p>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Foto cadastrada:</span>
                      <span className={isPhotoUploaded ? "font-medium text-success" : "font-medium text-warning-foreground"}>
                        {isPhotoUploaded ? "Presente" : "Não enviada"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Atestado médico:</span>
                      <span className={isMedApproved ? "font-medium text-success" : "font-medium text-muted-foreground"}>
                        {isMedApproved ? "Aprovado" : "Pendente ou opcional"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Turma vinculada:</span>
                      <span className={student.training_class ? "font-medium text-foreground" : "font-medium text-muted-foreground"}>
                        {student.training_class ? "Definida" : "Não definida"}
                      </span>
                    </div>
                  </div>

                  <form action={advanceToSignatureAction} className="pt-2">
                    <input type="hidden" name="student_id" value={student.$id} />
                    <FormSubmitButton className="min-h-11 w-full" pendingLabel="Liberando assinatura…">
                      <FilePenLineIcon aria-hidden="true" />
                      Liberar para assinatura digital
                    </FormSubmitButton>
                  </form>
                </section>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
