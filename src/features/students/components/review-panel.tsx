import Link from "next/link";
import {
  advanceToSignatureAction,
  reviewDocumentAction,
  saveFinancialReviewAction
} from "@/app/actions/enrollment-review";
import { renewContractAction } from "@/app/actions/renewals";
import { DateField } from "@/components/shared/date-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { EditStudentDialog } from "@/features/students/components/edit-student-dialog";
import type { TrainingClass } from "@/features/classes/types";
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
import { ROUTES } from "@/lib/navigation/routes";
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  HeartPulse,
  ImageIcon,
  Phone,
  User,
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

export function ReviewPanel({
  bundle,
  reviews,
  classes = [],
  notice
}: {
  bundle: EnrollmentBundle;
  reviews: Array<Record<string, unknown>>;
  classes?: TrainingClass[];
  notice?: string;
}) {
  const { student, enrollment, documents } = bundle;
  const currentBelt = student.gub ? beltForGub(student.gub as GubOption) : student.current_belt;
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
            <Link href={ROUTES.adminEnrollments} className="text-sm text-muted-foreground hover:underline">
              ← Voltar para lista de matrículas
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {student.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              CPF: {student.cpf || "Não informado"} · Faixa: {currentBelt ? `Faixa ${currentBelt}` : "Não informada"} {student.gub ? `(${student.gub}º GUB)` : ""}
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

      {/* 2. Card de Dados para Revisão (Design Polido e Estruturado) */}
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="size-5 text-primary" aria-hidden="true" />
              <div>
                <CardTitle className="text-lg">Ficha cadastral do aluno</CardTitle>
                <CardDescription>
                  Conferência detalhada dos dados pessoais, contato, emergência, turma e cuidados de saúde.
                </CardDescription>
              </div>
            </div>
            <EditStudentDialog student={student} classes={classes} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Bloco A: Identificação e Contato */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Phone className="size-4" aria-hidden="true" /> Identificação e Contato
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Data de Nascimento</span>
                <span className="font-medium text-foreground">
                  {dateValue(student.birth_date)
                    ? new Date(`${dateValue(student.birth_date)}T12:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">WhatsApp</span>
                <span className="font-medium text-foreground">
                  {formatBrazilianPhone(student.whatsapp) || "—"}
                </span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Contato do Responsável</span>
                <span className="font-medium text-foreground">{student.guardian_contact || "Não informado / próprio aluno"}</span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3 sm:col-span-2 lg:col-span-3">
                <span className="text-xs text-muted-foreground block">Endereço Residencial</span>
                <span className="font-medium text-foreground">{student.address || "—"}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Bloco B: Contato de Emergência */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Users className="size-4" aria-hidden="true" /> Contato de Emergência
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Nome</span>
                <span className="font-medium text-foreground">{student.emergency_contact_name || "—"}</span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Parentesco / Relação</span>
                <span className="font-medium text-foreground">{student.emergency_contact_relationship || "—"}</span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
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
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <Award className="size-4" aria-hidden="true" /> Taekwondo e Turma
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Turma Escolhida</span>
                <span className="font-medium text-foreground">{student.training_class || "—"}</span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <span className="text-xs text-muted-foreground block">Graduação Atual</span>
                <span className="font-medium text-foreground">
                  {currentBelt ? `Faixa ${currentBelt}` : "—"}{" "}
                  {student.gub ? `(${student.gub}º GUB)` : ""}
                </span>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
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
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <HeartPulse className="size-4" aria-hidden="true" /> Saúde e Cuidados
              </h3>
              {student.health_condition === "yes" ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  Condição informada
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-success border-success/40 bg-success/5">
                  <CheckCircle2 className="size-3 text-success" aria-hidden="true" />
                  Sem restrições declaradas
                </Badge>
              )}
            </div>

            {student.health_condition === "yes" ? (
              <div className="mt-3 space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
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
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 3. Documentos (Foto é item cadastral; Atestado médico requer aprovação) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Documentos e Anexos</CardTitle>
          </div>
          <CardDescription>
            A foto é um item de identificação cadastral. O atestado médico requer aprovação formal antes da assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* Card da Foto (Identificação - Não requer aprovação) */}
          <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <ImageIcon className="size-5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Foto do aluno (identificação)</p>
                {profilePhoto ? (
                  <Link
                    href={`/api/student-documents/${profilePhoto.$id}`}
                    className="text-xs text-primary underline mt-0.5 block"
                    target="_blank"
                  >
                    Visualizar imagem original
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Nenhuma foto enviada</p>
                )}
              </div>
            </div>
            {profilePhoto ? (
              <Badge variant="outline" className="text-xs">
                Cadastrada
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Pendente
              </Badge>
            )}
          </div>

          {/* Card do Atestado Médico (Requer Aprovação Formal) */}
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Activity className="size-5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">Atestado médico</p>
                  {medicalCertificate ? (
                    <Link
                      href={`/api/student-documents/${medicalCertificate.$id}`}
                      className="text-xs text-primary underline mt-0.5 block"
                      target="_blank"
                    >
                      Abrir documento enviado
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Nenhum atestado anexado</p>
                  )}
                </div>
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
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Não enviado
                </Badge>
              )}
            </div>

            {/* Ações de Aprovação do Atestado: Não clicáveis se já aprovado */}
            {medicalCertificate && medicalCertificate.status !== "approved" ? (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <form action={reviewDocumentAction}>
                  <input type="hidden" name="student_id" value={student.$id} />
                  <input type="hidden" name="document_id" value={medicalCertificate.$id} />
                  <input type="hidden" name="decision" value="approved" />
                  <FormSubmitButton size="sm" pendingLabel="Aprovando…">
                    Aprovar atestado
                  </FormSubmitButton>
                </form>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Reprovar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reprovar atestado médico?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Informe o motivo da reprovação para que o aluno ou responsável possa enviar um documento legível ou atualizado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <form action={reviewDocumentAction} className="space-y-4">
                      <input type="hidden" name="student_id" value={student.$id} />
                      <input type="hidden" name="document_id" value={medicalCertificate.$id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Field>
                        <FieldLabel htmlFor="document-reason">Motivo da reprovação</FieldLabel>
                        <Input
                          id="document-reason"
                          name="reason"
                          placeholder="Ex.: Imagem cortada ou vencido"
                          required
                        />
                      </Field>
                      <AlertDialogFooter>
                        <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                        <AlertDialogAction type="submit" variant="destructive">
                          Confirmar reprovação
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : medicalCertificate?.status === "approved" ? (
              <p className="text-xs text-success flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Atestado validado pela administração.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 4. Condições Financeiras e Contrato (Com Pré-preenchimento Inteligente) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Condições financeiras e contrato</CardTitle>
          </div>
          <CardDescription>
            Pré-preenchido automaticamente com o próximo dia {dueDay} e vigência de 1 ano. Ajuste conforme necessário antes de salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveFinancialReviewAction} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="student_id" value={student.$id} />

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

            <Separator className="md:col-span-3" />

            <DateField
              id="review-first-due"
              name="first_due_date"
              label="Primeiro vencimento"
              defaultValue={defaultFirstDueDate}
              required
            />

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

            <Separator className="md:col-span-3" />

            <FormSubmitButton className="md:col-span-3 md:w-fit" pendingLabel="Salvando condições…">
              Salvar condições contratuais
            </FormSubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* 5. Ação de Conclusão / Renovação */}
      {enrollment.status === "awaiting_renewal" ? (
        <Card>
          <CardHeader>
            <CardTitle>Renovar contrato</CardTitle>
            <CardDescription>
              Uma nova versão será emitida mantendo o histórico anterior preservado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={renewContractAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="student_id" value={student.$id} />
              <DateField
                id="renewal-end"
                name="ends_at"
                label="Nova data final"
                min={new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })}
                required
                className="min-w-60"
              />
              <FormSubmitButton pendingLabel="Emitindo renovação…">
                Emitir renovação
              </FormSubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck className="size-5 text-primary" aria-hidden="true" />
              <CardTitle>Concluir análise e emitir contrato</CardTitle>
            </div>
            <CardDescription>
              A assinatura digital é liberada após conferência dos dados, validação do atestado médico e confirmação das condições financeiras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={advanceToSignatureAction}>
              <input type="hidden" name="student_id" value={student.$id} />
              <FormSubmitButton pendingLabel="Liberando assinatura…">
                Liberar para assinatura digital
              </FormSubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 6. Histórico de Análises Realizadas */}
      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="history">
              <AccordionTrigger>Histórico da análise ({reviews.length})</AccordionTrigger>
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
        </CardContent>
      </Card>
    </div>
  );
}
