"use client";

import Link from "next/link";
import { useState } from "react";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { adminEventPath } from "@/lib/navigation/routes";

export type HubRow = {
  /** Valor enviado no formulário (id da inscrição ou do documento). */
  value: string;
  eventId: string;
  eventTitle: string;
  name: string;
  /** Documento da foto de perfil, quando o inscrito é aluno com foto. */
  photoDocumentId?: string;
  detail: string;
};

type Props = {
  /** Âncora usada pelo resumo de filas no topo da página. */
  id?: string;
  title: string;
  hint: string;
  rows: HubRow[];
  /** Server action do lote; sem ela a fila é só de consulta. */
  action?: (formData: FormData) => void | Promise<void>;
  /** Nome do campo no formulário (`registration_id` ou `document_id`). */
  fieldName?: string;
  actionLabel?: string;
  returnTo: string;
  hiddenFields?: Record<string, string>;
};

/** Fila da central de inscrições: lista por pendência com seleção e ação em lote. */
export function HubQueue({ id, title, hint, rows, action, fieldName = "registration_id", actionLabel, returnTo, hiddenFields }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const selectable = Boolean(action);

  function toggle(value: string, checked: boolean) {
    setSelected((current) => (checked ? [...new Set([...current, value])] : current.filter((item) => item !== value)));
  }

  const list = (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.value} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          {selectable ? <Checkbox name={fieldName} value={row.value} checked={selected.includes(row.value)} onCheckedChange={(checked) => toggle(row.value, checked === true)} aria-label={`Selecionar ${row.name}`} /> : null}
          <StudentAvatar name={row.name} photoDocumentId={row.photoDocumentId} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="truncate text-sm text-muted-foreground">{row.detail}</p>
          </div>
          <Link href={adminEventPath(row.eventId)} className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">
            {row.eventTitle}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-xs" aria-label={title}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {title}
            <StatusBadge tone={rows.length ? "warning" : "neutral"}>{rows.length}</StatusBadge>
          </h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {selectable && rows.length > 0 ? (
          <label className="flex min-h-9 items-center gap-2 text-sm" htmlFor={`select-all-${title}`}>
            <Checkbox id={`select-all-${title}`} checked={allSelected} onCheckedChange={(checked) => setSelected(checked === true ? rows.map((row) => row.value) : [])} />
            Selecionar todas
          </label>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">Nada pendente aqui.</p>
      ) : action ? (
        <form action={action}>
          <input type="hidden" name="return_to" value={returnTo} />
          {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {list}
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <FormSubmitButton className="min-h-11" disabled={selected.length === 0} pendingLabel="Aplicando…">
              {actionLabel ?? "Aplicar"} {selected.length ? `(${selected.length})` : ""}
            </FormSubmitButton>
          </div>
        </form>
      ) : (
        list
      )}
    </section>
  );
}
