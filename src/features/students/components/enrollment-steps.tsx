import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { DateField } from "@/components/shared/date-field";
import { FileField } from "@/components/shared/file-field";
import { PhoneField } from "@/components/shared/phone-field";
import { AddressFields } from "@/components/shared/address-fields";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Field as FormField, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DUE_DAY_OPTIONS } from "@/features/students/options";
import { GraduationFields } from "./graduation-fields";
import { StudentAvatar } from "./student-avatar";
import { Field, Section } from "./enrollment-form-fields";
import type { TrainingClass } from "@/features/classes/types";
import type { EnrollmentBundle } from "@/features/students/types";

type StepProps = { bundle: EnrollmentBundle; classes: TrainingClass[]; onValueChange?: (name: string, value: string) => void };
const dateValue = (value?: string | null) => value?.slice(0, 10) ?? "";
const labels = { profile_photo: "Foto do aluno", medical_certificate: "Atestado médico" } as const;
const documentStatusLabels: Record<string, string> = { pending: "Aguardando análise", approved: "Aprovado", rejected: "Precisa de correção" };
export function PersonalEnrollmentStep({ bundle, onValueChange }: StepProps) {
const { student } = bundle; const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
return <div className="space-y-4">
<Section
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
                      inputMode="numeric"
                      defaultValue={student.cpf ?? ""}
                      required
                      placeholder="Somente números"
                    />
                  </div>
                  <div className="sm:col-span-6 lg:col-span-3">
                    <DateField
                      id="enrollment-birth-date"
                      name="birth_date"
                      onValueChange={(value) => onValueChange?.("birth_date", value)}
                      label="Data de nascimento"
                      defaultValue={dateValue(student.birth_date)}
                      min="1920-01-01"
                      max={today}
                      required
                    />
                  </div>
                </div>
              </Section>
<Section
                title="Contato e endereço"
                description="Canais para contato da coordenação e endereço residencial com busca automática por CEP."
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
                  <div className="sm:col-span-12">
                    <AddressFields
                      defaultValue={student.address}
                      required
                    />
                  </div>
                </div>
              </Section>
</div>;
}
export function HealthEnrollmentStep({ bundle }: StepProps) {
const { student } = bundle;
return <div className="space-y-4">
<Section
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
<Section
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
</div>;
}
export function TrainingEnrollmentStep({ bundle, classes, onValueChange }: StepProps) {
const { student, enrollment } = bundle; const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); const selectableClasses = classes.filter((item) => item.status === "active" || item.$id === student.training_class_id);
return <div className="space-y-4">
<Section
                title="Taekwondo"
                description="Histórico marcial, graduação atual e turma semanal desejada."
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-12 sm:col-span-6">
                      <DateField
                        id="enrollment-tkd-start"
                        name="started_at_tkd"
                        onValueChange={(value) => onValueChange?.("started_at_tkd", value)}
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
<Section
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
</div>;
}
export function DocumentsEnrollmentStep({ bundle }: StepProps) {
const { student, documents } = bundle; const profilePhoto = documents.find((document) => document.document_type === "profile_photo" && document.status !== "rejected");
return <div className="space-y-4">
<Section
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
</div>;
}
