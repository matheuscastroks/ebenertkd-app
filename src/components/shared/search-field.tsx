"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function SearchField({
  id,
  name = "q",
  defaultValue,
  placeholder,
  label,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput ref={inputRef} id={id} name={name} type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={`Limpar busca por ${label.toLocaleLowerCase("pt-BR")}`}
              onClick={() => {
                if (!inputRef.current) return;
                inputRef.current.value = "";
                setValue("");
                inputRef.current.form?.requestSubmit();
              }}
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}
