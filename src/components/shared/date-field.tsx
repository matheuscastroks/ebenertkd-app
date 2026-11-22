"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function parseLocalDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

export function formatLocalDate(date?: Date) {
  return date && isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

/** Aplica máscara `dd/mm/aaaa` ou converte uma data ISO (`yyyy-MM-dd`) colada pelo usuário. */
export function maskDateInput(raw: string): string {
  const trimmed = raw.trim();
  const isoParsed = parseLocalDate(trimmed);
  if (isoParsed) {
    return format(isoParsed, "dd/MM/yyyy", { locale: ptBR });
  }

  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Interpreta uma data digitada em `dd/MM/yyyy` (ou ISO `yyyy-MM-dd`), rejeitando datas impossíveis. */
export function parseTypedDate(value: string): Date | undefined {
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return candidate;
    }
    return undefined;
  }

  return parseLocalDate(trimmed);
}

export function DateField({
  id,
  name,
  label,
  defaultValue,
  min,
  max,
  required = false,
  description,
  className,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  description?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const initialDate = parseLocalDate(defaultValue);
  const minDate = parseLocalDate(min);
  const maxDate = parseLocalDate(max);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(initialDate);
  const [inputValue, setInputValue] = useState<string>(() =>
    initialDate ? format(initialDate, "dd/MM/yyyy", { locale: ptBR }) : ""
  );
  const [month, setMonth] = useState<Date | undefined>(() => initialDate ?? maxDate ?? minDate);
  const [error, setError] = useState<string | null>(null);

  const disabled = [
    minDate ? { before: minDate } : undefined,
    maxDate ? { after: maxDate } : undefined,
  ].filter(Boolean) as Array<{ before: Date } | { after: Date }>;

  const clearSelection = () => {
    setSelected(undefined);
    onValueChange?.("");
  };

  const handleInputChange = (raw: string) => {
    const masked = maskDateInput(raw);
    setInputValue(masked);

    if (!masked) {
      setError(null);
      clearSelection();
      return;
    }

    if (masked.length < 10) {
      setError(null);
      clearSelection();
      return;
    }

    const parsed = parseTypedDate(masked);
    if (!parsed) {
      clearSelection();
      setError("Data inválida. Use o formato dd/mm/aaaa.");
      return;
    }

    const iso = formatLocalDate(parsed);
    if (min && minDate && iso < min) {
      clearSelection();
      setError(`Data anterior ao mínimo permitido (${format(minDate, "dd/MM/yyyy", { locale: ptBR })}).`);
      return;
    }

    if (max && maxDate && iso > max) {
      clearSelection();
      setError(`Data posterior ao máximo permitido (${format(maxDate, "dd/MM/yyyy", { locale: ptBR })}).`);
      return;
    }

    setError(null);
    setSelected(parsed);
    setMonth(parsed);
    onValueChange?.(iso);
  };

  const handleInputBlur = () => {
    if (inputValue.length > 0 && inputValue.length < 10) {
      setError("Data incompleta. Use o formato dd/mm/aaaa.");
    }
  };

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      <input type="hidden" name={name} value={formatLocalDate(selected)} />
      <Popover open={open} onOpenChange={setOpen}>
        <InputGroup>
          <InputGroupInput
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="dd/mm/aaaa"
            value={inputValue}
            required={required}
            aria-invalid={error ? true : undefined}
            className="pl-3.5"
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={handleInputBlur}
          />
          <InputGroupAddon align="inline-end">
            <PopoverTrigger asChild>
              <InputGroupButton
                size="icon-sm"
                aria-label={`Abrir calendário de ${label}`}
              >
                <CalendarDaysIcon aria-hidden="true" />
              </InputGroupButton>
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            disabled={disabled}
            startMonth={minDate}
            endMonth={maxDate}
            captionLayout={minDate || maxDate ? "dropdown" : "label"}
            onSelect={(date) => {
              setSelected(date);
              setError(null);
              if (date) {
                setInputValue(format(date, "dd/MM/yyyy", { locale: ptBR }));
                setMonth(date);
                onValueChange?.(formatLocalDate(date));
                setOpen(false);
              } else {
                setInputValue("");
                onValueChange?.("");
              }
            }}
          />
        </PopoverContent>
      </Popover>
      {error ? <FieldError>{error}</FieldError> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}
