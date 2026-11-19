"use client";

import { useState } from "react";
import { registerForEventAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  eventId: string;
  returnTo: string;
  options: Array<{ id: string; label: string }>;
  students: Array<{ profileId: string; name: string }>;
  guestsAllowed: boolean;
  maxCompanions: number;
};

/** Professor inscreve um aluno ou um convidado, mesmo com as inscrições encerradas (fica no histórico de auditoria). */
export function AddRegistrationDialog({ eventId, returnTo, options, students, guestsAllowed, maxCompanions }: Props) {
  const [who, setWho] = useState<string>(students[0]?.profileId ?? "__guest__");
  const guest = who === "__guest__";
  return (
    <ResponsiveDialog trigger={<Button className="min-h-11">Inscrever participante</Button>} title="Inscrever participante" description="A inscrição feita pelo professor não exige aceite de termos.">
      <form action={registerForEventAction} className="space-y-4 pt-2">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="return_to" value={returnTo} />
        {!guest ? <input type="hidden" name="student_profile_id" value={who} /> : null}
        <Field>
          <FieldLabel htmlFor="add-who">Quem</FieldLabel>
          <Select value={who} onValueChange={setWho}>
            <SelectTrigger id="add-who" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.profileId} value={student.profileId}>
                  {student.name}
                </SelectItem>
              ))}
              {guestsAllowed ? <SelectItem value="__guest__">Convidado (sem conta)</SelectItem> : null}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="add-option">Opção</FieldLabel>
          <Select name="option_id" defaultValue={options[0]?.id}>
            <SelectTrigger id="add-option" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {guest ? (
          <>
            <Field>
              <FieldLabel htmlFor="add-guest-name">Nome do convidado</FieldLabel>
              <Input id="add-guest-name" name="guest_name" required minLength={3} maxLength={128} className="h-11" />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-guest-contact">WhatsApp</FieldLabel>
              <Input id="add-guest-contact" name="guest_contact" type="tel" inputMode="tel" required className="h-11" />
              <FieldDescription>Apagado quando o evento for encerrado.</FieldDescription>
            </Field>
          </>
        ) : null}
        {maxCompanions > 0 ? (
          <Field>
            <FieldLabel htmlFor="add-companions">Acompanhantes</FieldLabel>
            <Input id="add-companions" name="companions" type="number" min={0} max={maxCompanions} defaultValue={0} className="h-11 tabular-nums" />
          </Field>
        ) : null}
        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Inscrevendo…">
          Inscrever
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}
