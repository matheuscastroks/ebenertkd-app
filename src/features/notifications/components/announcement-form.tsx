"use client";

import { useState } from "react";
import { publishAnnouncementAction } from "@/app/actions/notifications";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProfileOption = { id: string; name: string };
type ClassOption = { id: string; name: string; startTime: string };

export function AnnouncementForm({ profiles, classes }: { profiles: ProfileOption[]; classes: ClassOption[] }) {
  const [audience, setAudience] = useState("all");
  return (
        <form action={publishAnnouncementAction} className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2"><FieldLabel htmlFor="notice-title">Título</FieldLabel><Input id="notice-title" name="title" maxLength={128} required /></Field>
          <Field><FieldLabel htmlFor="notice-audience">Destinatários</FieldLabel><Select name="audience" value={audience} onValueChange={setAudience}><SelectTrigger id="notice-audience" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os usuários ativos</SelectItem><SelectItem value="class">Uma turma</SelectItem><SelectItem value="profile">Uma pessoa</SelectItem></SelectContent></Select></Field>
          {audience === "class" ? <Field><FieldLabel htmlFor="notice-class">Turma</FieldLabel><Select name="class_id" required><SelectTrigger id="notice-class" className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.startTime}</SelectItem>)}</SelectContent></Select></Field> : null}
          {audience === "profile" ? <Field><FieldLabel htmlFor="notice-profile">Pessoa</FieldLabel><Select name="profile_id" required><SelectTrigger id="notice-profile" className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{profiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><FieldDescription>Responsáveis ativos também recebem avisos enviados a menores.</FieldDescription></Field> : null}
          <Field className="md:col-span-2"><FieldLabel htmlFor="notice-body">Mensagem</FieldLabel><Textarea id="notice-body" name="body" className="min-h-28" maxLength={4000} required /></Field>
          <Field className="md:col-span-2"><FieldLabel htmlFor="notice-url">Link interno (opcional)</FieldLabel><Input id="notice-url" name="action_url" placeholder="/avisos" /><FieldDescription>Use apenas caminhos internos, como /aluno/financeiro.</FieldDescription></Field>
          <FormSubmitButton className="md:w-fit" pendingLabel="Publicando…">Publicar aviso</FormSubmitButton>
        </form>
  );
}
