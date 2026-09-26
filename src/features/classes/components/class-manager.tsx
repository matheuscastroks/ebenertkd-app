import Link from "next/link";
import {
  CalendarCheck2,
  CircleHelp,
  Clock,
  MapPin,
  Pencil,
  Plus,
  UsersRound
} from "lucide-react";
import { createTrainingClassAction, updateTrainingClassAction } from "@/app/actions/training-classes";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassStatusToggle } from "@/features/classes/components/class-status-toggle";
import { WEEKDAYS, type TrainingClass } from "@/features/classes/types";
import { adminClassPath } from "@/lib/navigation/routes";

const weekdayLabels: Record<string, string> = {
  Segunda: "Seg",
  Terça: "Ter",
  Quarta: "Qua",
  Quinta: "Qui",
  Sexta: "Sex",
  Sábado: "Sáb",
  Domingo: "Dom"
};

function WeekdayFields({ selected = [], idSuffix }: { selected?: string[]; idSuffix: string }) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Dias de treino da semana</FieldLegend>
      <FieldGroup className="flex-row flex-wrap gap-2 pt-1">
        {WEEKDAYS.map((day) => (
          <label
            key={day}
            htmlFor={`weekday-${day}-${idSuffix}`}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface-recessed/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-recessed cursor-pointer touch-manipulation depth-recessed"
          >
            <Checkbox
              id={`weekday-${day}-${idSuffix}`}
              name="weekdays"
              value={day}
              defaultChecked={selected.includes(day)}
            />
            <span>{day}</span>
          </label>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

function Fields({ trainingClass }: { trainingClass?: TrainingClass }) {
  const suffix = trainingClass?.$id ?? "new";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`class-name-${suffix}`}>Nome da turma</FieldLabel>
          <Input
            id={`class-name-${suffix}`}
            name="name"
            defaultValue={trainingClass?.name}
            placeholder="Ex.: Infantil — Noite (Tigres)"
            className="h-11 text-sm"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`class-location-${suffix}`}>Dojang / Local de treino</FieldLabel>
          <Input
            id={`class-location-${suffix}`}
            name="location"
            defaultValue={trainingClass?.location ?? ""}
            placeholder="Ex.: Dojang Principal ou Tatame 2"
            className="h-11 text-sm"
          />
        </Field>
      </div>

      <WeekdayFields selected={trainingClass?.weekdays} idSuffix={suffix} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`class-start-${suffix}`}>Horário de início</FieldLabel>
          <Input
            id={`class-start-${suffix}`}
            name="start_time"
            type="time"
            defaultValue={trainingClass?.start_time}
            className="h-11 text-sm"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`class-end-${suffix}`}>Horário de término</FieldLabel>
          <Input
            id={`class-end-${suffix}`}
            name="end_time"
            type="time"
            defaultValue={trainingClass?.end_time}
            className="h-11 text-sm"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`class-capacity-${suffix}`}>Capacidade máxima de alunos</FieldLabel>
          <Input
            id={`class-capacity-${suffix}`}
            name="capacity"
            type="number"
            min="1"
            max="500"
            defaultValue={trainingClass?.capacity ?? ""}
            placeholder="Ilimitado"
            className="h-11 text-sm"
          />
        </Field>
      </div>
    </div>
  );
}

export function ClassManager({ classes, notice }: { classes: TrainingClass[]; notice?: string }) {
  return (
    <div className="space-y-6">
      {notice ? (
        <OperationToast
          tone={notice.toLowerCase().includes("não") ? "error" : "success"}
          title={notice}
          clearParams={["created", "updated", "error"]}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Turmas ativas na academia
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Sobre a disponibilidade das turmas">
                  <CircleHelp className="size-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Turmas inativas não aparecem como opção na ficha de matrícula dos alunos.</TooltipContent>
            </Tooltip>
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Gerencie os horários, dias de treino e capacidade de alunos por turma.
          </p>
        </div>

        <ResponsiveDialog
          trigger={
            <Button className="h-10 shrink-0 font-medium touch-manipulation">
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              Nova turma
            </Button>
          }
          title="Cadastrar nova turma"
          description="Adicione uma turma com horários e dias fixos para os treinos da academia."
        >
          <form action={createTrainingClassAction} className="space-y-5">
            <Fields />
            <FormSubmitButton className="w-full sm:w-auto" pendingLabel="Criando turma…">
              Salvar nova turma
            </FormSubmitButton>
          </form>
        </ResponsiveDialog>
      </div>

      <section>
        {classes.length === 0 ? (
          <EmptyState
            title="Nenhuma turma cadastrada"
            description="Crie a primeira turma da academia para permitir que os alunos selecionem seus horários no cadastro."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {classes.map((trainingClass) => {
              const active = trainingClass.status === "active";
              return (
                <Card key={trainingClass.$id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg font-bold">
                          {trainingClass.name}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Clock className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                            {trainingClass.start_time} às {trainingClass.end_time}
                          </span>
                          {trainingClass.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                              {trainingClass.location}
                            </span>
                          ) : null}
                          {trainingClass.capacity ? (
                            <span className="flex items-center gap-1">
                              <UsersRound className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                              Até {trainingClass.capacity} alunos
                            </span>
                          ) : null}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge tone={active ? "success" : "neutral"}>
                          {active ? "Ativa" : "Pausada"}
                        </StatusBadge>
                        <ClassStatusToggle classId={trainingClass.$id} active={active} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 pt-2">
                      {trainingClass.weekdays.map((day) => (
                        <Badge key={day} variant="secondary" className="px-2 py-0.5 text-[11px] font-semibold">
                          {weekdayLabels[day] ?? day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
                    <Button asChild size="sm" className="h-9 touch-manipulation">
                      <Link href={adminClassPath(trainingClass.$id)}>
                        <CalendarCheck2 className="size-4 mr-1.5" aria-hidden="true" />
                        Aulas e chamada
                      </Link>
                    </Button>

                    <ResponsiveDialog
                      trigger={
                        <Button variant="outline" size="sm" className="h-9 touch-manipulation">
                          <Pencil className="size-3.5 mr-1.5" aria-hidden="true" />
                          Editar
                        </Button>
                      }
                      title={`Editar ${trainingClass.name}`}
                      description="Atualize nome, dias, horário, local e capacidade da turma."
                    >
                      <form action={updateTrainingClassAction} className="space-y-5">
                        <input type="hidden" name="class_id" value={trainingClass.$id} />
                        <Fields trainingClass={trainingClass} />
                        <FormSubmitButton className="w-full sm:w-auto" pendingLabel="Salvando…">
                          Salvar alterações
                        </FormSubmitButton>
                      </form>
                    </ResponsiveDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
