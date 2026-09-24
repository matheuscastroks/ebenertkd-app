import Link from "next/link";
import type { ReactNode } from "react";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingClass } from "@/features/classes/types";
import { DUE_DAY_OPTIONS } from "@/features/students/options";
import { GraduationFields } from "@/features/students/components/graduation-fields";
import type { EnrollmentBundle } from "@/features/students/types";

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";
const labels = { profile_photo: "Foto do aluno", medical_certificate: "Atestado médico" } as const;

function Field({ label, name, defaultValue, type = "text", required = false, ...props }: {
  label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean; min?: number; max?: number; placeholder?: string;
}) {
  return <label className="grid gap-2"><span className="text-sm font-medium">{label}{required ? " *" : ""}</span><Input name={name} type={type} defaultValue={defaultValue} required={required} {...props} /></label>;
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <Card><CardHeader><div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{number}</span><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></div></CardHeader><CardContent>{children}</CardContent></Card>;
}

export function EnrollmentForm({ bundle, targetProfileId, classes, message }: { bundle: EnrollmentBundle; targetProfileId: string; classes: TrainingClass[]; message?: string }) {
  const { student, enrollment, documents } = bundle;
  const locked = enrollment.status !== "draft";
  const selectableClasses = classes.filter((item) => item.status === "active" || item.$id === student.training_class_id);
  const completed = [student.cpf, student.birth_date, student.whatsapp, student.address, student.emergency_contact_name, student.started_at_tkd, student.current_belt, student.training_class_id, enrollment.requested_due_day].filter(Boolean).length;

  return <div className="space-y-5">
    <Card className="border-primary/15 bg-primary/[0.025]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Ficha de matrícula</CardTitle><CardDescription>Preencha cada bloco com calma. Você pode salvar e continuar depois.</CardDescription></div><Badge variant="outline">{enrollment.status.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Progresso dos dados principais</span><span>{completed}/9</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round((completed / 9) * 100)}%` }} /></div>{message ? <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p> : null}</CardContent></Card>

    <form className="space-y-5">
      <input type="hidden" name="target_profile_id" value={targetProfileId} />
      <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
        <Section number="1" title="Dados pessoais" description="Informações usadas para identificar o aluno."><div className="grid gap-4 md:grid-cols-2"><Field label="Nome completo" name="full_name" defaultValue={student.full_name} required /><Field label="CPF" name="cpf" defaultValue={student.cpf ?? ""} required placeholder="Somente números" /><Field label="Data de nascimento" name="birth_date" type="date" defaultValue={dateValue(student.birth_date)} required /></div></Section>

        <Section number="2" title="Contato" description="Como a academia pode falar com o aluno ou responsável."><div className="grid gap-4 md:grid-cols-2"><Field label="WhatsApp" name="whatsapp" defaultValue={student.whatsapp ?? ""} required /><Field label="Contato do responsável" name="guardian_contact" defaultValue={student.guardian_contact ?? ""} /><label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Endereço completo *</span><Textarea name="address" defaultValue={student.address ?? ""} required /></label></div></Section>

        <Section number="3" title="Emergência" description="Pessoa que deve ser acionada em caso de necessidade."><div className="grid gap-4 md:grid-cols-3"><Field label="Nome do contato" name="emergency_contact_name" defaultValue={student.emergency_contact_name ?? ""} required /><Field label="Parentesco" name="emergency_contact_relationship" defaultValue={student.emergency_contact_relationship ?? ""} required /><Field label="Telefone" name="emergency_contact_phone" defaultValue={student.emergency_contact_phone ?? ""} required /></div></Section>

        <Section number="4" title="Taekwondo" description="Histórico, graduação atual e turma desejada."><div className="grid gap-4 md:grid-cols-2"><Field label="Início no Taekwondo" name="started_at_tkd" type="date" defaultValue={dateValue(student.started_at_tkd)} required /><GraduationFields defaultBelt={student.current_belt} defaultGub={student.gub} /><label className="grid gap-2"><span className="text-sm font-medium">Turma desejada *</span><select name="training_class_id" defaultValue={student.training_class_id ?? ""} required className="h-8 rounded-lg border bg-background px-2.5 text-sm"><option value="">Selecione uma turma</option>{selectableClasses.map((item) => <option key={item.$id} value={item.$id}>{item.name} · {item.weekdays.map((day) => day.slice(0, 3)).join("/")} · {item.start_time}–{item.end_time}{item.status === "inactive" ? " (inativa)" : ""}</option>)}</select>{selectableClasses.length === 0 ? <span className="text-xs text-destructive">O professor ainda não cadastrou turmas disponíveis.</span> : null}</label></div></Section>

        <Section number="5" title="Saúde" description="Dados privados, acessíveis apenas ao responsável e à administração."><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-medium">Possui condição de saúde? *</span><select name="health_condition" defaultValue={student.health_condition ?? ""} required className="h-8 rounded-lg border bg-background px-2.5 text-sm"><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select></label><Field label="Medicamentos" name="medications" defaultValue={student.medications ?? ""} /><label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Detalhes da condição</span><Textarea name="health_details" defaultValue={student.health_details ?? ""} /></label><Field label="Alergias" name="allergies" defaultValue={student.allergies ?? ""} /><Field label="Lesões ou restrições" name="injuries" defaultValue={student.injuries ?? ""} /></div></Section>

        <Section number="6" title="Preferência de pagamento" description="Escolha o melhor dia para a mensalidade. O professor confirmará na análise."><label className="grid max-w-sm gap-2"><span className="text-sm font-medium">Dia de vencimento *</span><select name="requested_due_day" defaultValue={enrollment.requested_due_day ?? ""} required className="h-8 rounded-lg border bg-background px-2.5 text-sm"><option value="">Selecione o dia</option>{DUE_DAY_OPTIONS.map((day) => <option key={day} value={day}>Dia {day}</option>)}</select></label></Section>

        <Section number="7" title="Documentos" description="Arquivos privados de até 5 MB. O atestado também pode ser PDF."><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-medium">Foto do aluno</span><Input name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></label><label className="grid gap-2"><span className="text-sm font-medium">Atestado médico</span><Input name="medical_certificate" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>{documents.map((document) => <div key={document.$id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><Link className="font-medium underline" href={`/api/student-documents/${document.$id}`}>{labels[document.document_type]}</Link><Badge variant="outline">{document.status}</Badge></div>{document.rejection_reason ? <p className="mt-2 text-destructive">{document.rejection_reason}</p> : null}</div>)}</div></Section>
      </fieldset>
      {!locked ? <div className="sticky bottom-3 flex flex-wrap gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur"><Button type="submit" variant="outline" formAction={saveEnrollmentDraftAction}>Salvar rascunho</Button><Button type="submit" formAction={submitEnrollmentAction}>Enviar para análise</Button></div> : <p className="text-sm text-muted-foreground">A ficha foi enviada. Alterações serão liberadas pela administração quando necessário.</p>}
    </form>
  </div>;
}
