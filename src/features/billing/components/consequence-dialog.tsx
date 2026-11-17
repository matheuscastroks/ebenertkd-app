"use client";

import { startTransition, useRef, useState, type ReactNode } from "react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConsequenceDialog({ trigger, title, summary, effect, confirmLabel, destructive, action, children, formId, values }: {
  trigger: ReactNode;
  title: string;
  summary: Array<{ label: string; value: string; field?: string; kind?: "money" | "date" }>;
  effect: string;
  confirmLabel: string;
  destructive?: boolean;
  action: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
  formId?: string;
  values?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const locked = useRef(false);
  return <AlertDialog open={open} onOpenChange={(next) => {
    if (locked.current) return;
    const source = formId ? document.getElementById(formId) as HTMLFormElement | null : null;
    if (next && source && !source.reportValidity()) return;
    if (next && source) setFields(Object.fromEntries(Array.from(new FormData(source).entries()).map(([key, value]) => [key, String(value)])));
    setError("");
    setOpen(next);
  }}>
    <AlertDialogTrigger asChild data-confirmation-trigger>{trigger}</AlertDialogTrigger>
    <AlertDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{effect}</AlertDialogDescription></AlertDialogHeader>
      <dl className="grid gap-2 text-sm">{summary.map(({ label, value, field, kind }) => {
        const raw = field ? fields[field] : undefined;
        const display = raw && kind === "money" ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(raw)) : raw && kind === "date" ? new Date(`${raw.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : raw ?? value;
        return <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{display}</dd></div>;
      })}</dl>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const form = event.currentTarget;
        const formData = new FormData(form);
        if (locked.current) return;
        const source = formId ? document.getElementById(formId) as HTMLFormElement | null : null;
        if (formId && (!source || !source.reportValidity())) return;
        const data = source ? new FormData(source) : formData;
        for (const [name, value] of Object.entries(values ?? {})) data.set(name, value);
        const inputs = source ?? form;
        if (inputs && Array.from(inputs.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[required], textarea[required]")).some((input) => input.type !== "hidden" && (!input.value.trim() || input.value.trim().length < Math.max(input.minLength, 1)))) {
          setError("Preencha os campos obrigatórios com uma justificativa válida.");
          return;
        }
        locked.current = true;
        setPending(true);
        setError("");
        startTransition(async () => {
        try {
          await action(data);
          setOpen(false);
        } finally {
          locked.current = false;
          setPending(false);
        }
        });
      }}>
        <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} type="button">Cancelar</AlertDialogCancel>
          <Button disabled={pending} type="submit" variant={destructive ? "destructive" : "default"} className="min-h-11">{pending ? "Enviando…" : confirmLabel}</Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}
