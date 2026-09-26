import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { OperationToast } from "@/components/shared/operation-toast";
import { DateField } from "@/components/shared/date-field";
import { FileField } from "@/components/shared/file-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { PhoneField } from "@/components/shared/phone-field";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from "@/components/ui/attachment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field as FormField, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingClass } from "@/features/classes/types";
import { DUE_DAY_OPTIONS } from "@/features/students/options";
import { GraduationFields } from "@/features/students/components/graduation-fields";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import type { EnrollmentBundle } from "@/features/students/types";

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";
const labels = {
  profile_photo: "Foto do aluno",
  medical_certificate: "Atestado médico"
} as const;

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  under_review: "Em análise",
  awaiting_signature: "Aguardando assinatura",
  active: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
  awaiting_renewal: "Aguardando renovação"
};

const documentStatusLabels: Record<string, string> = {
  pending: "Aguardando análise",
  approved: "Aprovado",
  rejected: "Precisa de correção"
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  ...props
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `enrollment-${name}`;
  return (
    <FormField>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        {...props}
      />
    </FormField>
  );
}

function Section({
  number,
  title,
  description,
  children
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {number}
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EnrollmentForm({
  bundle,
  targetProfileId,
  classes,
  message
}: {
  bundle: EnrollmentBundle;
  targetProfileId: string;
  classes: TrainingClass[];
  message?: string;
}) {
  const { student, enrollment, documents } = bundle;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const isDraft = enrollment.status === "draft";
  const selectableClasses = classes.filter(
    (item) => item.status === "active" || item.$id === student.training_class_id
  );
  const profilePhoto = documents.find(
    (document) => document.document_type === "profile_photo" && document.status !== "rejected"
  );
  const medicalCertificate = documents.find(
    (document) => document.document_type === "medical_certificate" && document.status !== "rejected"
  );
  const completed = [
    student.cpf,
    student.birth_date,
    student.whatsapp,
    student.address,
    student.emergency_contact_name,
    student.started_at_tkd,
    student.current_belt,
    student.training_class_id,
    enrollment.requested_due_day,
    profilePhoto,
    medicalCertificate
  ].filter(Boolean).length;
  const progress = Math.round((completed / 11) * 100);

  return (
    <div className="space-y-5">
      <Card className="border-primary/15 bg-primary/[0.025]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ficha de matrícula</CardTitle>
              <CardDescription>
                Preencha cada bloco com calma. Você pode salvar como rascunho e continuar depois.
              </CardDescription>
            </div>
            <StatusBadge
              tone={
                enrollment.status === "cancelled"
                  ? "danger"
                  : enrollment.status === "active"
                    ? "success"
                    : enrollment.status === "awaiting_renewal"
                      ? "warning"
                      : enrollment.status === "draft"
                        ? "neutral"
                        : "info"
              }
            >
              {statusLabels[enrollment.status] ?? enrollment.status}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso dos dados essenciais</span>
            <span>{completed} de 11</span>
          </div>
          <Progress
            value={progress}
            aria-label={`${completed} de 11 itens essenciais preenchidos`}
          />
          {message ? (
            <OperationToast
              tone={
                message.includes("não") ||
                message.includes("Adicione") ||
                message.includes("erro")
                  ? "error"
                  : "success"
              }
              title={message}
              clearParams={["saved", "submitted", "error"]}
            />
          ) : null}
        </CardContent>
      </Card>

      <form className="space-y-5">
        <input type="hidden" name="target_profile_id" value={targetProfileId} />
        <fieldset className="space-y-5">
          {/* Seção 1: Dados pessoais (Grid 12 colunas) */}
          <Section
            number="1"
            title="Dados pessoais"
            description="Informações fundamentais de identificação do aluno."
          >
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12 lg:col-span-6">
                <Field
                  label="Nome completo"
                  name="full_name"
                  defaultValue={student.full_name}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="sm:col-span-6 lg:col-span-3">
                <Field
                  label="CPF"
                  name="cpf"
                  defaultValue={student.cpf ?? ""}
                  required
                  placeholder="Somente números"
                />
              </div>
              <div className="sm:col-span-6 lg:col-span-3">
                <DateField
                  id="enrollment-birth-date"
                  name="birth_date"
                  label="Data de nascimento"
                  defaultValue={dateValue(student.birth_date)}
                  min="1920-01-01"
                  max={today}
                  required
                />
              </div>
            </div>
          </Section>

          {/* Seção 2: Contato e Localização */}
          <Section
            number="2"
            title="Contato e endereço"
            description="Canais para contato da coordenação e endereço residencial."
          >
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12 sm:col-span-6">
                <PhoneField
                  id="enrollment-whatsapp"
                  label="WhatsApp"
                  name="whatsapp"
                  defaultValue={student.whatsapp ?? ""}
                  required
                />
              </div>
              <div className="sm:col-span-12 sm:col-span-6">
                <PhoneField
                  id="enrollment-guardian-contact"
                  label="Contato do responsável"
                  name="guardian_contact"
                  defaultValue={student.guardian_contact ?? ""}
                  placeholder="(21) 9 6518-8988"
                />
              </div>
              <FormField className="sm:col-span-12">
                <FieldLabel htmlFor="enrollment-address">Endereço completo *</FieldLabel>
                <Textarea
                  id="enrollment-address"
                  name="address"
                  defaultValue={student.address ?? ""}
                  required
                  rows={2}
                />
              </FormField>
            </div>
          </Section>

          {/* Seção 3: Contato de emergência */}
          <Section
            number="3"
            title="Contato de emergência"
            description="Pessoa autorizada a ser acionada em caso de necessidade médica ou urgente."
          >
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12 lg:col-span-5">
                <Field
                  label="Nome do contato"
                  name="emergency_contact_name"
                  defaultValue={student.emergency_contact_name ?? ""}
                  required
                />
              </div>
              <div className="sm:col-span-6 lg:col-span-3">
                <Field
                  label="Parentesco / Relação"
                  name="emergency_contact_relationship"
                  defaultValue={student.emergency_contact_relationship ?? ""}
                  required
                />
              </div>
              <div className="sm:col-span-6 lg:col-span-4">
                <PhoneField
                  id="enrollment-emergency-phone"
                  label="Telefone de emergência"
                  name="emergency_contact_phone"
                  defaultValue={student.emergency_contact_phone ?? ""}
                  required
                />
              </div>
            </div>
          </Section>

          {/* Seção 4: Taekwondo e Turma */}
          <Section
            number="4"
            title="Taekwondo"
            description="Histórico marcial, graduação atual e turma semanal desejada."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-12 sm:col-span-6">
                  <DateField
                    id="enrollment-tkd-start"
                    name="started_at_tkd"
                    label="Início no Taekwondo"
                    defaultValue={dateValue(student.started_at_tkd)}
                    min="1950-01-01"
                    max={today}
                    required
                  />
                </div>
                <div className="sm:col-span-12 sm:col-span-6">
                  <FormField>
                    <FieldLabel htmlFor="training-class">Turma desejada *</FieldLabel>
                    <Select
                      name="training_class_id"
                      defaultValue={student.training_class_id ?? ""}
                      required
                    >
                      <SelectTrigger id="training-class" className="w-full">
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableClasses.map((item) => (
                          <SelectItem key={item.$id} value={item.$id}>
                            {item.name} · {item.weekdays.map((day) => day.slice(0, 3)).join("/")} ·{" "}
                            {item.start_time}–{item.end_time}
                            {item.status === "inactive" ? " (inativa)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectableClasses.length === 0 ? (
                      <FieldDescription className="text-destructive">
                        O professor ainda não cadastrou turmas disponíveis.
                      </FieldDescription>
                    ) : null}
                  </FormField>
                </div>
              </div>
              <GraduationFields defaultBelt={student.current_belt} defaultGub={student.gub} />
            </div>
          </Section>

          {/* Seção 5: Saúde e Cuidados */}
          <Section
            number="5"
            title="Saúde e bem-estar"
            description="Informações confidenciais acessíveis somente ao professor e responsáveis para segurança do praticante."
          >
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12 sm:col-span-4">
                <FormField>
                  <FieldLabel htmlFor="health-condition">Possui condição de saúde? *</FieldLabel>
                  <Select
                    name="health_condition"
                    defaultValue={student.health_condition ?? ""}
                    required
                  >
                    <SelectTrigger id="health-condition" className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Não</SelectItem>
                      <SelectItem value="yes">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="sm:col-span-12 sm:col-span-8">
                <Field
                  label="Medicamentos de uso contínuo"
                  name="medications"
                  defaultValue={student.medications ?? ""}
                  placeholder="Se houver, liste aqui"
                />
              </div>
              <FormField className="sm:col-span-12">
                <FieldLabel htmlFor="health-details">Detalhes da condição de saúde</FieldLabel>
                <Textarea
                  id="health-details"
                  name="health_details"
                  defaultValue={student.health_details ?? ""}
                  placeholder="Informações adicionais relevantes para o treino"
                  rows={2}
                />
              </FormField>
              <div className="sm:col-span-12 sm:col-span-6">
                <Field
                  label="Alergias"
                  name="allergies"
                  defaultValue={student.allergies ?? ""}
                  placeholder="Medicamentos, alimentos ou outras"
                />
              </div>
              <div className="sm:col-span-12 sm:col-span-6">
                <Field
                  label="Lesões anteriores ou restrições físicas"
                  name="injuries"
                  defaultValue={student.injuries ?? ""}
                  placeholder="Cirurgias, articulações, etc."
                />
              </div>
            </div>
          </Section>

          {/* Seção 6: Preferência de pagamento */}
          <Section
            number="6"
            title="Preferência de pagamento"
            description="Escolha o melhor dia para o vencimento da mensalidade. Será homologado na revisão contratual."
          >
            <FormField className="max-w-xs">
              <FieldLabel htmlFor="requested-due-day">Dia de vencimento preferido *</FieldLabel>
              <Select
                name="requested_due_day"
                defaultValue={
                  enrollment.requested_due_day ? String(enrollment.requested_due_day) : ""
                }
                required
              >
                <SelectTrigger id="requested-due-day" className="w-full">
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
            </FormField>
          </Section>

          {/* Seção 7: Documentos */}
          <Section
            number="7"
            title="Documentos"
            description="Arquivos seguros de até 5 MB. A foto é obrigatória para conclusão e emissão de graduação."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex items-start gap-4 rounded-xl border bg-muted/20 p-4">
                <StudentAvatar
                  name={student.full_name}
                  photoDocumentId={profilePhoto?.$id}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <FileField
                    name="profile_photo"
                    label="Foto do aluno *"
                    accept="image/jpeg,image/png,image/webp"
                    description={
                      profilePhoto
                        ? "Envie outro arquivo somente se desejar substituir a foto atual."
                        : "Obrigatória. JPG, PNG ou WebP, até 5 MB."
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <FileField
                  name="medical_certificate"
                  label="Atestado médico"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  description="Recomendado para prática esportiva. Imagem ou PDF, até 5 MB."
                />
              </div>

              {documents.length > 0 ? (
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  {documents.map((document) => (
                    <Attachment key={document.$id}>
                      <AttachmentMedia>
                        {document.document_type === "profile_photo" ? (
                          <ImageIcon aria-hidden="true" />
                        ) : (
                          <FileText aria-hidden="true" />
                        )}
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>
                          <Link
                            className="underline"
                            href={`/api/student-documents/${document.$id}`}
                          >
                            {labels[document.document_type]}
                          </Link>
                        </AttachmentTitle>
                        <AttachmentDescription>
                          {document.status === "rejected"
                            ? document.rejection_reason
                              ? `Correção: ${document.rejection_reason}`
                              : "Precisa de correção"
                            : documentStatusLabels[document.status] ?? document.status}
                        </AttachmentDescription>
                      </AttachmentContent>
                    </Attachment>
                  ))}
                </div>
              ) : null}
            </div>
          </Section>
        </fieldset>

        {isDraft ? (
          <div className="sticky bottom-3 z-10 flex flex-wrap gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
            <FormSubmitButton
              variant="outline"
              formAction={saveEnrollmentDraftAction}
              pendingLabel="Salvando…"
            >
              Salvar rascunho
            </FormSubmitButton>
            <FormSubmitButton formAction={submitEnrollmentAction} pendingLabel="Enviando…">
              Enviar para análise
            </FormSubmitButton>
          </div>
        ) : (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
            <p className="text-xs text-muted-foreground">
              Você pode atualizar suas informações cadastrais, de contato, emergência e saúde a qualquer momento.
            </p>
            <FormSubmitButton
              formAction={saveEnrollmentDraftAction}
              pendingLabel="Salvando alterações…"
            >
              Salvar alterações
            </FormSubmitButton>
          </div>
        )}
      </form>
    </div>
  );
}
