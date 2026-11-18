import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { CalendarCheck2Icon } from "@/components/ui/calendar-check-2";
import { PlusIcon } from "@/components/ui/plus";
import { SquarePenIcon } from "@/components/ui/square-pen";
import { UsersRoundIcon } from "@/components/ui/users-round";
import { createTrainingClassAction, updateTrainingClassAction } from "@/app/actions/training-classes";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
            className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:bg-muted motion-reduce:transition-none"
          >
            <Checkbox
              id={`weekday-${day}-${idSuffix}`}
              name="weekdays"
              value={day}
              defaultChecked={selected.includes(day)}
            />
            <span>{weekdayLabels[day] ?? day}</span>
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
          <FieldLabel htmlFor={`class-capacity-${suffix}`}>Capacidade máxima</FieldLabel>
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

export function ClassManager({ classes, notice, noticeTone = "success" }: { classes: TrainingClass[]; notice?: string; noticeTone?: "error" | "success" }) {
  return (
    <div className="space-y-6">
      {notice ? (
        <OperationToast
          tone={noticeTone}
          title={notice}
          clearParams={["created", "updated", "error"]}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {classes.length === 0 ? "" : `${classes.filter((item) => item.status === "active").length} de ${classes.length} turma${classes.length === 1 ? "" : "s"} ativa${classes.length === 1 ? "" : "s"}`}
        </p>

        <ResponsiveDialog
          trigger={
            <Button className="min-h-11 shrink-0 font-medium touch-manipulation">
              <PlusIcon className="size-4 mr-1.5" aria-hidden="true" />
              Nova turma
            </Button>
          }
          title="Cadastrar nova turma"
          description="Adicione uma turma com horários e dias fixos para os treinos da academia."
        >
          <form action={createTrainingClassAction} className="space-y-5">
            <Fields />
            <FormSubmitButton className="min-h-11 w-full sm:w-auto" pendingLabel="Criando turma…">
              Salvar nova turma
            </FormSubmitButton>
          </form>
        </ResponsiveDialog>
      </div>

      <section>
        {classes.length === 0 ? (
          <EmptyState
            title="Nenhuma turma cadastrada"
            description="Use Nova turma para cadastrar o primeiro horário. Os alunos escolhem a turma no cadastro."
          />
        ) : (
          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {classes.map((trainingClass) => {
              const active = trainingClass.status === "active";
              return (
                <li
                  key={trainingClass.$id}
                  className="t-interactive-row flex flex-col gap-3 px-4 py-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">
                        {trainingClass.name}
                      </p>
                      <StatusBadge tone={active ? "success" : "neutral"}>
                        {active ? "Ativa" : "Pausada"}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground tabular-nums">
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
                          <UsersRoundIcon className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                          Até {trainingClass.capacity} alunos
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {trainingClass.weekdays.map((day) => (
                        <Badge key={day} variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                          {weekdayLabels[day] ?? day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <ClassStatusToggle classId={trainingClass.$id} active={active} />

                    <Button asChild size="sm" variant="outline" className="min-h-11 touch-manipulation">
                      <Link href={adminClassPath(trainingClass.$id)}>
                        <CalendarCheck2Icon className="size-4 mr-1.5" aria-hidden="true" />
                        Fazer chamada
                      </Link>
                    </Button>

                    <ResponsiveDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="min-h-11 touch-manipulation">
                          <SquarePenIcon className="size-3.5 mr-1.5" aria-hidden="true" />
                          Editar
                        </Button>
                      }
                      title={`Editar ${trainingClass.name}`}
                      description="Atualize nome, dias, horário, local e capacidade da turma."
                    >
                      <form action={updateTrainingClassAction} className="space-y-5">
                        <input type="hidden" name="class_id" value={trainingClass.$id} />
                        <Fields trainingClass={trainingClass} />
                        <FormSubmitButton className="min-h-11 w-full sm:w-auto" pendingLabel="Salvando…">
                          Salvar alterações
                        </FormSubmitButton>
                      </form>
                    </ResponsiveDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
