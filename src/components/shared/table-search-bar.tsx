"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function TableSearchBar({
  id,
  label,
  placeholder,
  paramName = "q",
  ariaLabel = "Buscar na tabela",
}: {
  id: string;
  label: string;
  placeholder: string;
  paramName?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(() => searchParams.get(paramName) ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncFromLocation = () => {
      setValue(new URLSearchParams(window.location.search).get(paramName) ?? "");
    };
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [paramName]);

  const commitQuery = (nextRaw: string) => {
    const trimmed = nextRaw.trim();
    const query = new URLSearchParams(window.location.search);
    if (trimmed) {
      query.set(paramName, trimmed);
    } else {
      query.delete(paramName);
    }
    query.delete("page");
    startTransition(() => {
      router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    });
  };

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitQuery(nextValue), 280);
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setValue("");
    commitQuery("");
    inputRef.current?.focus();
  };

  return (
    <div
      role="search"
      aria-label={ariaLabel}
      aria-busy={pending}
      className="transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80"
    >
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            id={id}
            name={paramName}
            type="search"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (timerRef.current) clearTimeout(timerRef.current);
                commitQuery(value);
              }
            }}
            placeholder={placeholder}
          />
          {value ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={`Limpar busca por ${label.toLocaleLowerCase("pt-BR")}`}
                onClick={handleClear}
              >
                <XIcon aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Field>
    </div>
  );
}
