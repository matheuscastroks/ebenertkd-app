import Link from "next/link";
import { saveEnrollmentDraftAction, submitEnrollmentAction } from "@/app/actions/enrollment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EnrollmentBundle } from "@/features/students/types";

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";
const labels = { profile_photo: "Foto do aluno", medical_certificate: "Atestado médico" } as const;

function Field({ label, name, defaultValue, type = "text", required = false, ...props }: {
  label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean; min?: number; max?: number; placeholder?: string;
}) {
  return <label className="grid gap-2"><span className="text-sm font-medium">{label}{required ? " *" : ""}</span><Input name={name} type={type} defaultValue={defaultValue} required={required} {...props} /></label>;
}

export function EnrollmentForm({ bundle, targetProfileId, message }: { bundle: EnrollmentBundle; targetProfileId: string; message?: string }) {
  const { student, enrollment, documents } = bundle;
  const locked = enrollment.status !== "draft";
  const completed = [student.cpf, student.birth_date, student.whatsapp, student.address, student.started_at_tkd, student.current_belt, enrollment.requested_due_day].filter(Boolean).length;
  return <div className="space-y-5">
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Ficha de matrícula</CardTitle><CardDescription>Salve o rascunho quando quiser. Campos com * são exigidos no envio.</CardDescription></div><Badge variant="outline">{enrollment.status.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Progresso dos dados principais</span><span>{completed}/7</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round((completed / 7) * 100)}%` }} /></div>
      {message ? <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{message}</p> : null}
    </CardContent></Card>

    <form className="space-y-5">
      <input type="hidden" name="target_profile_id" value={targetProfileId} />
      <fieldset disabled={locked} className="space-y-5 disabled:opacity-70">
        <Card><CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo" name="full_name" defaultValue={student.full_name} required />
          <Field label="CPF" name="cpf" defaultValue={student.cpf ?? ""} required placeholder="Somente números" />
          <Field label="Data de nascimento" name="birth_date" type="date" defaultValue={dateValue(student.birth_date)} required />
          <Field label="WhatsApp" name="whatsapp" defaultValue={student.whatsapp ?? ""} required />
          <label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Endereço completo *</span><Textarea name="address" defaultValue={student.address ?? ""} required /></label>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Contato de emergência e Taekwondo</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Contato de emergência" name="emergency_contact_name" defaultValue={student.emergency_contact_name ?? ""} required />
          <Field label="Parentesco" name="emergency_contact_relationship" defaultValue={student.emergency_contact_relationship ?? ""} required />
          <Field label="Telefone de emergência" name="emergency_contact_phone" defaultValue={student.emergency_contact_phone ?? ""} required />
          <Field label="Início no Taekwondo" name="started_at_tkd" type="date" defaultValue={dateValue(student.started_at_tkd)} required />
          <Field label="Faixa atual" name="current_belt" defaultValue={student.current_belt ?? ""} required />
          <Field label="GUB" name="gub" type="number" min={1} max={10} defaultValue={student.gub ?? ""} required />
          <Field label="Turma / horário" name="training_class" defaultValue={student.training_class ?? ""} />
          <Field label="Contato do responsável" name="guardian_contact" defaultValue={student.guardian_contact ?? ""} />
          <Field label="Melhor dia de vencimento" name="requested_due_day" type="number" min={1} max={28} defaultValue={enrollment.requested_due_day ?? ""} required />
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Saúde</CardTitle><CardDescription>Esses dados são restritos ao responsável e à administração.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2"><span className="text-sm font-medium">Possui condição de saúde? *</span><select name="health_condition" defaultValue={student.health_condition ?? ""} required className="h-8 rounded-lg border bg-background px-2.5"><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select></label>
          <Field label="Medicamentos" name="medications" defaultValue={student.medications ?? ""} />
          <label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Detalhes da condição</span><Textarea name="health_details" defaultValue={student.health_details ?? ""} /></label>
          <Field label="Alergias" name="allergies" defaultValue={student.allergies ?? ""} />
          <Field label="Lesões ou restrições" name="injuries" defaultValue={student.injuries ?? ""} />
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Documentos</CardTitle><CardDescription>Até 5 MB. Foto em JPG, PNG ou WebP; atestado também pode ser PDF.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2"><span className="text-sm font-medium">Foto do aluno</span><Input name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
          <label className="grid gap-2"><span className="text-sm font-medium">Atestado médico</span><Input name="medical_certificate" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" /></label>
          {documents.map((document) => <div key={document.$id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><Link className="font-medium underline" href={`/api/student-documents/${document.$id}`}>{labels[document.document_type]}</Link><Badge variant="outline">{document.status}</Badge></div>{document.rejection_reason ? <p className="mt-2 text-destructive">{document.rejection_reason}</p> : null}</div>)}
        </CardContent></Card>
      </fieldset>
      {!locked ? <div className="flex flex-wrap gap-3"><Button type="submit" variant="outline" formAction={saveEnrollmentDraftAction}>Salvar rascunho</Button><Button type="submit" formAction={submitEnrollmentAction}>Enviar para análise</Button></div> : <p className="text-sm text-muted-foreground">A ficha foi enviada. Alterações serão liberadas pela administração quando necessário.</p>}
    </form>
  </div>;
}
