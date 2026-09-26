"use client";

import { useState } from "react";
import { Pencil, UserPen } from "lucide-react";
import { adminUpdateStudentAction } from "@/app/actions/enrollment-review";
import { DateField } from "@/components/shared/date-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { PhoneField } from "@/components/shared/phone-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingClass } from "@/features/classes/types";
import { GraduationFields } from "@/features/students/components/graduation-fields";
import type { Student } from "@/features/students/types";

const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";

export function EditStudentDialog({
  student,
  classes = []
}: {
  student: Student;
  classes?: TrainingClass[];
}) {
  const [open, setOpen] = useState(false);
  const [hasHealthCondition, setHasHealthCondition] = useState(
    student.health_condition === "yes" ? "yes" : "no"
  );
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Pencil className="size-3.5" aria-hidden="true" />
          <span>Editar dados</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPen className="size-5 text-primary" aria-hidden="true" />
            Editar Dados do Aluno
          </DialogTitle>
          <DialogDescription>
            Atualize as informações cadastrais, de contato, graduação ou saúde de {student.full_name}.
          </DialogDescription>
        </DialogHeader>

        <form action={adminUpdateStudentAction} className="space-y-5 pt-2 text-sm">
          <input type="hidden" name="student_id" value={student.$id} />

          {/* 1. Identificação Básica */}
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
              Identificação
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field>
                  <FieldLabel htmlFor="edit-full-name">Nome completo *</FieldLabel>
                  <Input
                    id="edit-full-name"
                    name="full_name"
                    defaultValue={student.full_name}
                    required
                  />
                </Field>
              </div>

              <div>
                <Field>
                  <FieldLabel htmlFor="edit-cpf">CPF</FieldLabel>
                  <Input
                    id="edit-cpf"
                    name="cpf"
                    defaultValue={student.cpf ?? ""}
                    placeholder="Somente números"
                  />
                </Field>
              </div>

              <div>
                <DateField
                  id="edit-birth-date"
                  name="birth_date"
                  label="Data de nascimento"
                  defaultValue={dateValue(student.birth_date)}
                  max={today}
                />
              </div>

              <div>
                <DateField
                  id="edit-started-at-tkd"
                  name="started_at_tkd"
                  label="Início no Taekwondo"
                  defaultValue={dateValue(student.started_at_tkd)}
                  max={today}
                />
              </div>

              <div>
                <Field>
                  <FieldLabel htmlFor="edit-class">Turma</FieldLabel>
                  <Select name="training_class_id" defaultValue={student.training_class_id ?? ""}>
                    <SelectTrigger id="edit-class" className="w-full">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.$id} value={c.$id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          {/* 2. Graduação */}
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
              Graduação Marcial
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <GraduationFields
                defaultBelt={student.current_belt}
                defaultGub={student.gub}
              />
            </div>
          </div>

          {/* 3. Contato e Endereço */}
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
              Contato e Localização
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <PhoneField
                  id="edit-whatsapp"
                  name="whatsapp"
                  label="WhatsApp"
                  defaultValue={student.whatsapp ?? ""}
                />
              </div>

              <div>
                <Field>
                  <FieldLabel htmlFor="edit-guardian">Contato do responsável</FieldLabel>
                  <Input
                    id="edit-guardian"
                    name="guardian_contact"
                    defaultValue={student.guardian_contact ?? ""}
                    placeholder="Nome e telefone do responsável"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field>
                  <FieldLabel htmlFor="edit-address">Endereço residencial</FieldLabel>
                  <Input
                    id="edit-address"
                    name="address"
                    defaultValue={student.address ?? ""}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* 4. Contato de Emergência */}
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
              Contato de Emergência
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Field>
                  <FieldLabel htmlFor="edit-em-name">Nome do contato</FieldLabel>
                  <Input
                    id="edit-em-name"
                    name="emergency_contact_name"
                    defaultValue={student.emergency_contact_name ?? ""}
                  />
                </Field>
              </div>

              <div>
                <Field>
                  <FieldLabel htmlFor="edit-em-rel">Parentesco</FieldLabel>
                  <Input
                    id="edit-em-rel"
                    name="emergency_contact_relationship"
                    defaultValue={student.emergency_contact_relationship ?? ""}
                  />
                </Field>
              </div>

              <div>
                <PhoneField
                  id="edit-em-phone"
                  name="emergency_contact_phone"
                  label="Telefone de emergência"
                  defaultValue={student.emergency_contact_phone ?? ""}
                />
              </div>
            </div>
          </div>

          {/* 5. Saúde e Cuidados */}
          <div>
            <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-3">
              Saúde e Cuidados
            </h4>
            <div className="space-y-3">
              <div>
                <Field>
                  <FieldLabel htmlFor="edit-health-condition">
                    Possui condição de saúde ou restrição médica?
                  </FieldLabel>
                  <Select
                    name="health_condition"
                    value={hasHealthCondition}
                    onValueChange={setHasHealthCondition}
                  >
                    <SelectTrigger id="edit-health-condition" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Não possui restrições</SelectItem>
                      <SelectItem value="yes">Sim, possui condição/restrição</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {hasHealthCondition === "yes" && (
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div>
                    <Field>
                      <FieldLabel htmlFor="edit-health-details">Detalhes da condição</FieldLabel>
                      <Textarea
                        id="edit-health-details"
                        name="health_details"
                        defaultValue={student.health_details ?? ""}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="edit-medications">Medicamentos em uso</FieldLabel>
                      <Textarea
                        id="edit-medications"
                        name="medications"
                        defaultValue={student.medications ?? ""}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="edit-allergies">Alergias</FieldLabel>
                      <Textarea
                        id="edit-allergies"
                        name="allergies"
                        defaultValue={student.allergies ?? ""}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="edit-injuries">Lesões anteriores</FieldLabel>
                      <Textarea
                        id="edit-injuries"
                        name="injuries"
                        defaultValue={student.injuries ?? ""}
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <FormSubmitButton pendingLabel="Salvando alterações…">
              Salvar alterações
            </FormSubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
