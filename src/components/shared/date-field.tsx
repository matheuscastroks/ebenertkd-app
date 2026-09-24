"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseLocalDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

export function formatLocalDate(date?: Date) {
  return date && isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

export function DateField({ id, name, label, defaultValue, min, max, required = false, description, className }: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  description?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(() => parseLocalDate(defaultValue));
  const minDate = parseLocalDate(min);
  const maxDate = parseLocalDate(max);
  const disabled = [minDate ? { before: minDate } : undefined, maxDate ? { after: maxDate } : undefined].filter(Boolean) as Array<{ before: Date } | { after: Date }>;

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}{required ? " *" : ""}</FieldLabel>
      <input type="hidden" name={name} value={formatLocalDate(selected)} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" aria-required={required} className={cn("w-full justify-start text-left font-normal", !selected && "text-muted-foreground")}>
            <CalendarDays aria-hidden="true" />
            {selected ? format(selected, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected ?? maxDate ?? minDate}
            disabled={disabled}
            startMonth={minDate}
            endMonth={maxDate}
            captionLayout={minDate || maxDate ? "dropdown" : "label"}
            onSelect={(date) => {
              setSelected(date);
              if (date) setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}
