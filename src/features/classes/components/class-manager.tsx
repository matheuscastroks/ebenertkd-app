import { createTrainingClassAction, setTrainingClassStatusAction, updateTrainingClassAction } from "@/app/actions/training-classes";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WEEKDAYS, type TrainingClass } from "@/features/classes/types";

function WeekdayFields({ selected = [], idSuffix }: { selected?: string[]; idSuffix: string }) {
  return <FieldSet><FieldLegend variant="label">Dias da semana</FieldLegend><FieldGroup className="flex-row flex-wrap gap-2">{WEEKDAYS.map((day) => <Field key={day} orientation="horizontal" className="w-auto rounded-lg border px-3 py-2"><Checkbox id={`weekday-${day}-${idSuffix}`} name="weekdays" value={day} defaultChecked={selected.includes(day)} /><FieldLabel htmlFor={`weekday-${day}-${idSuffix}`}>{day.slice(0, 3)}</FieldLabel></Field>)}</FieldGroup></FieldSet>;
}

function Fields({ trainingClass }: { trainingClass?: TrainingClass }) {
  const suffix = trainingClass?.$id ?? "new";
  return <><Field><FieldLabel htmlFor={`class-name-${suffix}`}>Nome da turma</FieldLabel><Input id={`class-name-${suffix}`} name="name" defaultValue={trainingClass?.name} placeholder="Ex.: Infantil — noite" required /></Field><WeekdayFields selected={trainingClass?.weekdays} idSuffix={suffix} /><div className="grid gap-3 sm:grid-cols-3"><Field><FieldLabel htmlFor={`class-start-${suffix}`}>Início</FieldLabel><Input id={`class-start-${suffix}`} name="start_time" type="time" defaultValue={trainingClass?.start_time} required /></Field><Field><FieldLabel htmlFor={`class-end-${suffix}`}>Término</FieldLabel><Input id={`class-end-${suffix}`} name="end_time" type="time" defaultValue={trainingClass?.end_time} required /></Field><Field><FieldLabel htmlFor={`class-capacity-${suffix}`}>Limite de alunos</FieldLabel><Input id={`class-capacity-${suffix}`} name="capacity" type="number" min="1" max="500" defaultValue={trainingClass?.capacity ?? ""} placeholder="Sem limite" /></Field></div></>;
}

export function ClassManager({ classes, notice }: { classes: TrainingClass[]; notice?: string }) {
  return <div className="space-y-5">{notice ? <FeedbackAlert tone={notice.toLowerCase().includes("não") ? "danger" : "success"} title={notice} /> : null}<Card><CardHeader><CardTitle>Nova turma</CardTitle><CardDescription>Cadastre somente horários que podem ser escolhidos pelos alunos.</CardDescription></CardHeader><CardContent><form action={createTrainingClassAction} className="space-y-4"><Fields /><FormSubmitButton pendingLabel="Criando turma…">Criar turma</FormSubmitButton></form></CardContent></Card><section className="space-y-3"><div><h2 className="text-lg font-semibold">Turmas cadastradas</h2><p className="text-sm text-muted-foreground">Turmas inativas deixam de aparecer em novas matrículas.</p></div>{classes.length === 0 ? <EmptyState title="Nenhuma turma cadastrada" description="Crie uma turma para liberar horários na matrícula dos alunos." /> : classes.map((trainingClass) => <Card key={trainingClass.$id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{trainingClass.name}</CardTitle><StatusBadge tone={trainingClass.status === "active" ? "success" : "neutral"}>{trainingClass.status === "active" ? "Ativa" : "Inativa"}</StatusBadge></div></CardHeader><CardContent className="space-y-4"><form action={updateTrainingClassAction} className="space-y-4"><input type="hidden" name="class_id" value={trainingClass.$id} /><Fields trainingClass={trainingClass} /><FormSubmitButton pendingLabel="Salvando…" variant="outline">Salvar alterações</FormSubmitButton></form><form action={setTrainingClassStatusAction}><input type="hidden" name="class_id" value={trainingClass.$id} /><input type="hidden" name="status" value={trainingClass.status === "active" ? "inactive" : "active"} /><Button type="submit" variant={trainingClass.status === "active" ? "destructive" : "default"}>{trainingClass.status === "active" ? "Desativar turma" : "Reativar turma"}</Button></form></CardContent></Card>)}</section></div>;
}
