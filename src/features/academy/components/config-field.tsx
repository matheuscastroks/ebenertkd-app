"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/shared/info-tip";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

/** Campo de configuração: rótulo com ajuda em (?) e mensagem de erro do servidor logo abaixo. */
export function ConfigField({
  id,
  label,
  help,
  error,
  children,
  className
}: {
  id: string;
  label: string;
  /** Explicação curta mostrada no tooltip (?) ao lado do rótulo. */
  help?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {help ? <InfoTip label={`Ajuda: ${label}`}>{help}</InfoTip> : null}
      </div>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
