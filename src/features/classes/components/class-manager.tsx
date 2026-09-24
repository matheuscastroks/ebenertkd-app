import Link from "next/link";
import { CalendarCheck2, CircleHelp, Pencil } from "lucide-react";
import { createTrainingClassAction, updateTrainingClassAction } from "@/app/actions/training-classes";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassStatusToggle } from "@/features/classes/components/class-status-toggle";
import { WEEKDAYS, type TrainingClass } from "@/features/classes/types";
import { adminClassPath } from "@/lib/navigation/routes";

function WeekdayFields({ selected = [], idSuffix }: { selected?: string[]; idSuffix: string }) {
  return <FieldSet><FieldLegend variant="label">Dias da semana</FieldLegend><FieldGroup className="flex-row flex-wrap gap-2">{WEEKDAYS.map((day) => <Field key={day} orientation="horizontal" className="w-auto rounded-lg border px-3 py-2"><Checkbox id={`weekday-${day}-${idSuffix}`} name="weekdays" value={day} defaultChecked={selected.includes(day)} /><FieldLabel htmlFor={`weekday-${day}-${idSuffix}`}>{day.slice(0, 3)}</FieldLabel></Field>)}</FieldGroup></FieldSet>;
}

function Fields({ trainingClass }: { trainingClass?: TrainingClass }) {
  const suffix = trainingClass?.$id ?? "new";
  return <><div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor={`class-name-${suffix}`}>Nome da turma</FieldLabel><Input id={`class-name-${suffix}`} name="name" defaultValue={trainingClass?.name} placeholder="Ex.: Infantil — noite" required /></Field><Field><FieldLabel htmlFor={`class-location-${suffix}`}>Local</FieldLabel><Input id={`class-location-${suffix}`} name="location" defaultValue={trainingClass?.location ?? ""} placeholder="Ex.: Dojang principal" /></Field></div><WeekdayFields selected={trainingClass?.weekdays} idSuffix={suffix} /><div className="grid gap-3 sm:grid-cols-3"><Field><FieldLabel htmlFor={`class-start-${suffix}`}>Início</FieldLabel><Input id={`class-start-${suffix}`} name="start_time" type="time" defaultValue={trainingClass?.start_time} required /></Field><Field><FieldLabel htmlFor={`class-end-${suffix}`}>Término</FieldLabel><Input id={`class-end-${suffix}`} name="end_time" type="time" defaultValue={trainingClass?.end_time} required /></Field><Field><FieldLabel htmlFor={`class-capacity-${suffix}`}>Limite de alunos</FieldLabel><Input id={`class-capacity-${suffix}`} name="capacity" type="number" min="1" max="500" defaultValue={trainingClass?.capacity ?? ""} placeholder="Sem limite" /></Field></div></>;
}

export function ClassManager({ classes, notice }: { classes: TrainingClass[]; notice?: string }) {
  return <div className="space-y-5">
    {notice ? <OperationToast tone={notice.toLowerCase().includes("não") ? "error" : "success"} title={notice} clearParams={["created", "updated", "error"]} /> : null}
    <Card><CardHeader><CardTitle>Nova turma</CardTitle><CardDescription>Cadastre somente horários que podem ser escolhidos pelos alunos.</CardDescription></CardHeader><CardContent><form action={createTrainingClassAction} className="space-y-4"><Fields /><FormSubmitButton pendingLabel="Criando turma…">Criar turma</FormSubmitButton></form></CardContent></Card>
    <section className="space-y-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold">Turmas cadastradas<Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="Sobre a disponibilidade das turmas"><CircleHelp aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Turmas inativas não aparecem em novas matrículas.</TooltipContent></Tooltip></h2><p className="text-sm text-muted-foreground">Ative, pause ou edite os horários oferecidos aos alunos.</p></div>
      {classes.length === 0 ? <EmptyState title="Nenhuma turma cadastrada" description="Crie uma turma para liberar horários na matrícula dos alunos." /> : <div className="grid gap-3 lg:grid-cols-2">{classes.map((trainingClass) => {
        const active = trainingClass.status === "active";
        return <Card key={trainingClass.$id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{trainingClass.name}</CardTitle><CardDescription className="mt-1">{trainingClass.weekdays.map((day) => day.slice(0, 3)).join(", ")} · {trainingClass.start_time}–{trainingClass.end_time}{trainingClass.location ? ` · ${trainingClass.location}` : ""}{trainingClass.capacity ? ` · até ${trainingClass.capacity} alunos` : ""}</CardDescription></div><div className="flex items-center gap-2"><StatusBadge tone={active ? "success" : "neutral"}>{active ? "Ativa" : "Inativa"}</StatusBadge><ClassStatusToggle classId={trainingClass.$id} active={active} /></div></div></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href={adminClassPath(trainingClass.$id)}><CalendarCheck2 aria-hidden="true" />Aulas e chamada</Link></Button><ResponsiveDialog trigger={<Button variant="outline"><Pencil aria-hidden="true" />Editar turma</Button>} title={`Editar ${trainingClass.name}`} description="Atualize nome, dias, horário, local e capacidade sem sair da lista."><form action={updateTrainingClassAction} className="space-y-4"><input type="hidden" name="class_id" value={trainingClass.$id} /><Fields trainingClass={trainingClass} /><FormSubmitButton pendingLabel="Salvando…">Salvar alterações</FormSubmitButton></form></ResponsiveDialog></CardContent></Card>;
      })}</div>}
    </section>
  </div>;
}
