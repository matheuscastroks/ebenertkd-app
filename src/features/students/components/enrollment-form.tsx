import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { FileField } from "@/components/shared/file-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
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
const labels = { profile_photo: "Foto do aluno", medical_certificate: "Atestado médico" } as const;
const statusLabels: Record<string, string> = { draft: "Rascunho", submitted: "Enviada", under_review: "Em análise", awaiting_signature: "Aguardando assinatura", active: "Ativa", paused: "Pausada", cancelled: "Cancelada", awaiting_renewal: "Aguardando renovação" };

function Field({ label, name, defaultValue, type = "text", required = false, ...props }: {
  label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean; min?: number; max?: number; placeholder?: string; autoComplete?: string;
}) {
  const id = `enrollment-${name}`;
  return <FormField><FieldLabel htmlFor={id}>{label}{required ? " *" : ""}</FieldLabel><Input id={id} name={name} type={type} defaultValue={defaultValue} required={required} {...props} /></FormField>;
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <Card><CardHeader><div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{number}</span><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></div></CardHeader><CardContent>{children}</CardContent></Card>;
}

export function EnrollmentForm({ bundle, targetProfileId, classes, message }: { bundle: EnrollmentBundle; targetProfileId: string; classes: TrainingClass[]; message?: string }) {
  const { student, enrollment, documents } = bundle;
  const locked = enrollment.status !== "draft";
  const selectableClasses = classes.filter((item) => item.status === "active" || item.$id === student.training_class_id);
  const profilePhoto = documents.find((document) => document.document_type === "profile_photo" && document.status !== "rejected");
  const medicalCertificate = documents.find((document) => document.document_type === "medical_certificate" && document.status !== "rejected");
  const completed = [student.cpf, student.birth_date, student.whatsapp, student.address, student.emergency_contact_name, student.started_at_tkd, student.current_belt, student.training_class_id, enrollment.requested_due_day, profilePhoto, medicalCertificate].filter(Boolean).length;
  const progress = Math.round((completed / 11) * 100);

  return <div className="space-y-5">
    <Card className="border-primary/15 bg-primary/[0.025]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Ficha de matrícula</CardTitle><CardDescription>Preencha cada bloco com calma. Você pode salvar e continuar depois.</CardDescription></div><StatusBadge tone={enrollment.status === "cancelled" ? "danger" : enrollment.status === "active" ? "success" : enrollment.status === "awaiting_renewal" ? "warning" : enrollment.status === "draft" ? "neutral" : "info"}>{statusLabels[enrollment.status] ?? enrollment.status}</StatusBadge></div></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-xs text-muted-foreground"><span>Progresso dos dados essenciais</span><span>{completed} de 11</span></div><Progress value={progress} aria-label={`${completed} de 11 itens essenciais preenchidos`} />{message ? <FeedbackAlert tone={message.includes("não") || message.includes("Adicione") ? "danger" : "success"} title={message} /> : null}</CardContent></Card>

    <form className="space-y-5">
      <input type="hidden" name="target_profile_id" value={targetProfileId} />
      <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
        <Section number="1" title="Dados pessoais" description="Informações usadas para identificar o aluno."><div className="grid gap-4 md:grid-cols-2"><Field label="Nome completo" name="full_name" defaultValue={student.full_name} required autoComplete="name" /><Field label="CPF" name="cpf" defaultValue={student.cpf ?? ""} required placeholder="Somente números" /><Field label="Data de nascimento" name="birth_date" type="date" defaultValue={dateValue(student.birth_date)} required /></div></Section>

        <Section number="2" title="Contato" description="Como a academia pode falar com o aluno ou responsável."><div className="grid gap-4 md:grid-cols-2"><Field label="WhatsApp" name="whatsapp" defaultValue={student.whatsapp ?? ""} required autoComplete="tel" /><Field label="Contato do responsável" name="guardian_contact" defaultValue={student.guardian_contact ?? ""} autoComplete="tel" /><FormField className="md:col-span-2"><FieldLabel htmlFor="enrollment-address">Endereço completo *</FieldLabel><Textarea id="enrollment-address" name="address" defaultValue={student.address ?? ""} required /></FormField></div></Section>

        <Section number="3" title="Emergência" description="Pessoa que deve ser acionada em caso de necessidade."><div className="grid gap-4 md:grid-cols-3"><Field label="Nome do contato" name="emergency_contact_name" defaultValue={student.emergency_contact_name ?? ""} required /><Field label="Parentesco" name="emergency_contact_relationship" defaultValue={student.emergency_contact_relationship ?? ""} required /><Field label="Telefone" name="emergency_contact_phone" defaultValue={student.emergency_contact_phone ?? ""} required autoComplete="tel" /></div></Section>

        <Section number="4" title="Taekwondo" description="Histórico, graduação atual e turma desejada."><div className="grid gap-4 md:grid-cols-2"><Field label="Início no Taekwondo" name="started_at_tkd" type="date" defaultValue={dateValue(student.started_at_tkd)} required /><GraduationFields defaultBelt={student.current_belt} defaultGub={student.gub} /><FormField><FieldLabel htmlFor="training-class">Turma desejada *</FieldLabel><Select name="training_class_id" defaultValue={student.training_class_id ?? ""} required><SelectTrigger id="training-class" className="w-full"><SelectValue placeholder="Selecione uma turma" /></SelectTrigger><SelectContent>{selectableClasses.map((item) => <SelectItem key={item.$id} value={item.$id}>{item.name} · {item.weekdays.map((day) => day.slice(0, 3)).join("/")} · {item.start_time}–{item.end_time}{item.status === "inactive" ? " (inativa)" : ""}</SelectItem>)}</SelectContent></Select>{selectableClasses.length === 0 ? <FieldDescription className="text-destructive">O professor ainda não cadastrou turmas disponíveis.</FieldDescription> : null}</FormField></div></Section>

        <Section number="5" title="Saúde" description="Dados privados, acessíveis apenas ao responsável e à administração."><div className="grid gap-4 md:grid-cols-2"><FormField><FieldLabel htmlFor="health-condition">Possui condição de saúde? *</FieldLabel><Select name="health_condition" defaultValue={student.health_condition ?? ""} required><SelectTrigger id="health-condition" className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="no">Não</SelectItem><SelectItem value="yes">Sim</SelectItem></SelectContent></Select></FormField><Field label="Medicamentos" name="medications" defaultValue={student.medications ?? ""} /><FormField className="md:col-span-2"><FieldLabel htmlFor="health-details">Detalhes da condição</FieldLabel><Textarea id="health-details" name="health_details" defaultValue={student.health_details ?? ""} /></FormField><Field label="Alergias" name="allergies" defaultValue={student.allergies ?? ""} /><Field label="Lesões ou restrições" name="injuries" defaultValue={student.injuries ?? ""} /></div></Section>

        <Section number="6" title="Preferência de pagamento" description="Escolha o melhor dia para a mensalidade. O professor confirmará na análise."><FormField className="max-w-sm"><FieldLabel htmlFor="requested-due-day">Dia de vencimento *</FieldLabel><Select name="requested_due_day" defaultValue={enrollment.requested_due_day ? String(enrollment.requested_due_day) : ""} required><SelectTrigger id="requested-due-day" className="w-full"><SelectValue placeholder="Selecione o dia" /></SelectTrigger><SelectContent>{DUE_DAY_OPTIONS.map((day) => <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>)}</SelectContent></Select></FormField></Section>

        <Section number="7" title="Documentos" description="Arquivos privados de até 5 MB. A foto é obrigatória para enviar a ficha."><div className="grid gap-5 md:grid-cols-2"><div className="flex items-start gap-4 rounded-xl border bg-muted/20 p-4"><StudentAvatar name={student.full_name} photoDocumentId={profilePhoto?.$id} size="lg" /><div className="min-w-0 flex-1"><FileField name="profile_photo" label="Foto do aluno *" accept="image/jpeg,image/png,image/webp" description={profilePhoto ? "Envie outra imagem somente se quiser substituir a foto atual." : "Obrigatória. JPG, PNG ou WebP, até 5 MB."} /></div></div><FileField name="medical_certificate" label="Atestado médico" accept="image/jpeg,image/png,image/webp,application/pdf" description="Imagem ou PDF, até 5 MB." /><div className="flex flex-wrap gap-3 md:col-span-2">{documents.map((document) => <Attachment key={document.$id}><AttachmentMedia>{document.document_type === "profile_photo" ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}</AttachmentMedia><AttachmentContent><AttachmentTitle><Link className="underline" href={`/api/student-documents/${document.$id}`}>{labels[document.document_type]}</Link></AttachmentTitle><AttachmentDescription>{document.status === "rejected" ? document.rejection_reason : document.status}</AttachmentDescription></AttachmentContent></Attachment>)}</div></div></Section>
      </fieldset>
      {!locked ? <div className="sticky bottom-3 z-10 flex flex-wrap gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur"><FormSubmitButton variant="outline" formAction={saveEnrollmentDraftAction} pendingLabel="Salvando…">Salvar rascunho</FormSubmitButton><FormSubmitButton formAction={submitEnrollmentAction} pendingLabel="Enviando…">Enviar para análise</FormSubmitButton></div> : <FeedbackAlert tone="info" title="Ficha enviada" description="Alterações serão liberadas pela administração quando necessário." />}
    </form>
  </div>;
}
