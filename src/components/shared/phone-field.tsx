"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatBrazilianPhone } from "@/lib/phone";

export function PhoneField({
  id,
  name,
  label,
  defaultValue = "",
  placeholder = "(21) 9 6518-8988",
  required = false,
  description,
  className,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  className?: string;
}) {
  const [value, setValue] = useState(() => formatBrazilianPhone(defaultValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(formatBrazilianPhone(e.target.value));
  };

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        maxLength={17}
        autoComplete="tel"
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
