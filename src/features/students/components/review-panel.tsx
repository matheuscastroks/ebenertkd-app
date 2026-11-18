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
import {
  ACCESS_STATUS_LABELS,
  type StudentAppAccessState,
  type StudentAppAccessStatus
} from "@/features/billing/access-lock-rules";
import {
  PARQ_STATUS_LABELS,
  type ParqAssessment,
  type ParqStatus
} from "@/features/students/parq-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import {
  beltForGub,
  calculateDefaultContractDates,
  calculateNextDueDate,
  DUE_DAY_OPTIONS,
  type GubOption
} from "@/features/students/options";
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
  Users
} from "lucide-react";

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
  notice
}: {
  bundle: EnrollmentBundle;
  reviews: Array<Record<string, unknown>>;
  classes?: TrainingClass[];
  parqAssessment?: ParqAssessment;
  accessState?: StudentAppAccessState;
  notice?: string;
}) {
  const { student, enrollment, documents } = bundle;
  const currentBelt = student.current_belt || (student.gub != null ? beltForGub(student.gub as GubOption) : undefined);
  const profilePhoto = documents.find((doc) => doc.document_type === "profile_photo");
  const medicalCertificate = documents.find((doc) => doc.document_type === "medical_certificate");

  const dueDay = enrollment.approved_due_day ?? enrollment.requested_due_day ?? 10;
  const defaultFirstDueDate = enrollment.first_due_date
    ? dateValue(enrollment.first_due_date)
    : calculateNextDueDate(dueDay);
  const contractDates = calculateDefaultContractDates(
    enrollment.contract_start,
    enrollment.contract_end
  );

  const isPhotoUploaded = Boolean(profilePhoto);
  const isMedApproved = medicalCertificate?.status === "approved";

  return (
    <div className="space-y-6">
      {/* 1. Cabeçalho do Aluno com Avatar e Status Geral */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudentAvatar
            name={student.full_name}
            photoDocumentId={profilePhoto?.$id}
            size="lg"
          />
          <div>
            <p className="text-sm text-muted-foreground">
              CPF {student.cpf || "não informado"} · {currentBelt ? `Faixa ${currentBelt}` : "Faixa não informada"} {student.gub ? `(${student.gub}º GUB)` : (student.gub === 0 ? "(Dan)" : "")}
            </p>
          </div>
        </div>
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
      </div>

      {notice ? (
        <OperationToast
          tone={notice.includes("Não") || notice.includes("erro") ? "error" : "success"}
          title={notice}
          clearParams={["updated", "error"]}
        />
      ) : null}

      {/* Grid de 2 Colunas no Desktop (Painel de Inspeção e Conferência) */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Coluna da Esquerda (7 colunas): Superfície agrupada com Ficha, Documentos e Histórico */}
        <div className="lg:col-span-7 overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
          {/* Seção 1: Ficha cadastral do aluno */}
          <section className="p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Ficha cadastral do aluno</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conferência detalhada dos dados pessoais, contato, emergência, turma e cuidados de saúde.
                </p>
              </div>
              <EditStudentDialog student={student} classes={classes} />
            </div>

            <div className="space-y-5">
              {/* Bloco A: Identificação e Contato */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Phone className="size-4" aria-hidden="true" /> Identificação e Contato
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
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

              <Separator />

              {/* Bloco B: Contato de Emergência */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Users className="size-4" aria-hidden="true" /> Contato de Emergência
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Nome</span>
                    <span className="font-medium text-foreground">{student.emergency_contact_name || "—"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Parentesco / Relação</span>
                    <span className="font-medium text-foreground">{student.emergency_contact_relationship || "—"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Telefone</span>
                    <span className="font-medium text-foreground">
                      {formatBrazilianPhone(student.emergency_contact_phone) || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bloco C: Taekwondo e Turma */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Award className="size-4" aria-hidden="true" /> Taekwondo e Turma
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Turma Escolhida</span>
                    <span className="font-medium text-foreground">{student.training_class || "—"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Graduação Atual</span>
                    <span className="font-medium text-foreground">
                      {currentBelt ? `Faixa ${currentBelt}` : "—"}{" "}
                      {student.gub ? `(${student.gub}º GUB)` : (student.gub === 0 ? "(Dan)" : "")}
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

              <Separator />

              {/* Bloco D: Saúde e Cuidados */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <HeartPulse className="size-4" aria-hidden="true" /> Saúde e Cuidados
                  </h3>
                  {student.health_condition === "yes" ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Condição informada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="size-3 text-success" aria-hidden="true" />
                      Sem restrições declaradas
                    </Badge>
                  )}
                </div>

                {student.health_condition === "yes" ? (
                  <div className="mt-3 space-y-3 border-l-2 border-warning pl-4 text-sm">
                    {student.health_details ? (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground block">Detalhes da condição</span>
                        <p className="font-medium text-foreground mt-0.5">{student.health_details}</p>
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-3 pt-1">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground block">Medicamentos</span>
                        <span className="text-foreground">{student.medications || "Nenhum informado"}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground block">Alergias</span>
                        <span className="text-foreground">{student.allergies || "Nenhuma informada"}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground block">Lesões ou Restrições</span>
                        <span className="text-foreground">{student.injuries || "Nenhuma informada"}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* Seção 2: Documentos enviados */}
          <section className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Documentos enviados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A foto é item cadastral. O atestado médico requer validação da administração antes da assinatura.
              </p>
            </div>

            <div className="divide-y divide-border">
              {/* Foto do Aluno */}
              <div className="space-y-3 py-3.5 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Foto do aluno (identificação)</p>
                  {profilePhoto ? (
                    <Badge variant="outline" className="text-sm">
                      Cadastrada
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-sm">
                      Pendente
                    </Badge>
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
                  <p className="text-sm text-muted-foreground">Nenhuma foto enviada</p>
                )}
              </div>

              {/* Atestado Médico */}
              <div className="space-y-3 py-3.5 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Atestado médico</p>
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
                    <Badge variant="outline" className="text-sm text-muted-foreground">
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
                            ? "Aguardando novo envio"
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
                          Abrir documento enviado
                        </Link>
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum atestado anexado</p>
                )}

                {medicalCertificate && medicalCertificate.status !== "approved" ? (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
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
                            placeholder="Ex.: Imagem cortada ou vencido"
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
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Atestado validado pela administração.
                  </p>
                ) : null}
              </div>

              {/* Questionário PAR-Q anual (CREF1) */}
              {parqAssessment ? (
                <div className="space-y-2.5 py-3.5 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Questionário PAR-Q anual (CREF1)</p>
                    <StatusBadge tone={parqToneMap[parqAssessment.status]}>
                      {PARQ_STATUS_LABELS[parqAssessment.status]}
                    </StatusBadge>
                  </div>
                  {parqAssessment.signedAt ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="tabular-nums">
                        Assinado em {formatBusinessDateBr(parqAssessment.signedAt)} · Válido até{" "}
                        {formatBusinessDateBr(parqAssessment.expiresAt)}
                        {parqAssessment.signerName ? ` · Por ${parqAssessment.signerName}` : ""}
                      </p>
                      {parqAssessment.hasYesAnswer ? (
                        <p className="flex items-center gap-1.5 text-warning-foreground">
                          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            Respondeu &quot;Sim&quot; nas perguntas{" "}
                            <span className="font-medium tabular-nums">
                              {parqAssessment.yesQuestionNumbers.join(", ")}
                            </span>
                            {" "}— conferir atestado médico atualizado.
                          </span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                          Todas as 10 perguntas respondidas com &quot;Não&quot;.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Questionário anual de prontidão física ainda não preenchido pelo aluno ou responsável.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          {/* Seção 3: Histórico de Análises Realizadas */}
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
                        <p className="text-muted-foreground text-sm">
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

        {/* Coluna da Direita (5 colunas): Superfície agrupada com Condições Financeiras e Conclusão */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
          {/* Seção 1: Condições Financeiras e Contrato */}
          <section className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Condições financeiras e contratuais</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Valores e vigência de 1 ano pré-preenchidos com base no dia {dueDay}. Ajuste conforme necessário antes de salvar.
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
                    defaultValue={centsToReaisInput(enrollment.monthly_fee_cents ?? 15000)}
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
                    {DUE_DAY_OPTIONS.map((day) => (
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
                    label="Fim do contrato (1 ano padrão)"
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

          {/* Seção 2: Conclusão / Renovação */}
          {enrollment.status === "awaiting_renewal" ? (
            <section className="p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Renovar contrato</h2>
                <p className="mt-1 text-sm text-muted-foreground">
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
                <h2 className="text-base font-semibold text-foreground">Concluir análise e emitir contrato</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A assinatura digital é liberada após conferência dos dados, validação do atestado médico e confirmação das condições financeiras.
                </p>
              </div>

              {/* Checklist de requisitos para liberar assinatura */}
              <div className="divide-y divide-border border-y border-border py-1 text-sm">
                <p className="py-1.5 font-medium">Pré-requisitos</p>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Foto cadastrada:</span>
                  <span className={isPhotoUploaded ? "font-medium text-foreground" : "font-medium text-warning-foreground"}>
                    {isPhotoUploaded ? "Presente" : "Não enviada"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Atestado médico:</span>
                  <span className={isMedApproved ? "font-medium text-foreground" : "font-medium text-muted-foreground"}>
                    {isMedApproved ? "Aprovado" : "Pendente ou opcional"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Turma vinculada:</span>
                  <span className={student.training_class ? "font-medium text-foreground" : "font-medium text-muted-foreground"}>
                    {student.training_class ? "Definida" : "Não definida"}
                  </span>
                </div>
              </div>

              <form action={advanceToSignatureAction}>
                <input type="hidden" name="student_id" value={student.$id} />
                <FormSubmitButton className="min-h-11 w-full" pendingLabel="Liberando assinatura…">
                  <FilePenLineIcon aria-hidden="true" />
                  Liberar para assinatura digital
                </FormSubmitButton>
              </form>
            </section>
          )}

          {/* Seção 3: Ciclo mensal de acesso ao app (30 dias) e liberação temporária */}
          {accessState ? (
            <section className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Ciclo mensal de acesso (30 dias)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O aplicativo fecha automaticamente 30 dias após o último pagamento confirmado, salvo comprovante em análise ou liberação manual.
                  </p>
                </div>
                <StatusBadge tone={accessToneMap[accessState.status]}>
                  {ACCESS_STATUS_LABELS[accessState.status]}
                </StatusBadge>
              </div>

              <dl className="divide-y divide-border border-y border-border text-sm">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted-foreground">Último pagamento mensal</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {accessState.lastPaidAt ? formatBusinessDateBr(accessState.lastPaidAt) : "Sem registro"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted-foreground">Acesso válido até</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {accessState.accessValidUntil ? formatBusinessDateBr(accessState.accessValidUntil) : "—"}
                  </dd>
                </div>
                {accessState.overrideUntil ? (
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">Liberação manual ativa até</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {formatBusinessDateBr(accessState.overrideUntil)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <form action={setAccessOverrideAction} className="space-y-3">
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
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
