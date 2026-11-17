import type { ReactNode } from "react";
import { Field as FormField, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  ...props
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric";
}) {
  const id = `enrollment-${name}`;
  return (
    <FormField>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        {...props}
      />
    </FormField>
  );
}

export function Section({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 md:p-6 shadow-xs space-y-4">
      <div className="flex items-start gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Separator />
      {children}
    </section>
  );
}

