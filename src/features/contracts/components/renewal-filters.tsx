"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/** Busca por aluno nas renovações. A janela de vencimento fica nos chips da página. */
export function RenewalFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setOptimisticQuery] = useOptimistic(searchParams.get("q") ?? "");

  // Sistema externo: o histórico do navegador. Mantém o campo igual à URL ao voltar.
  useEffect(() => {
    const restore = () => {
      if (inputRef.current) inputRef.current.value = new URLSearchParams(window.location.search).get("q") ?? "";
    };
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const apply = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    startTransition(() => {
      setOptimisticQuery(value);
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    });
  };

  const handleClear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (inputRef.current) inputRef.current.value = "";
    apply("");
  };

  return (
    <div role="search" aria-label="Buscar renovações" aria-busy={pending} className="flex items-end gap-2 transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80">
      <Field className="min-w-0 flex-1">
        <FieldLabel htmlFor="renewal-search" className="sr-only">Aluno</FieldLabel>
        <InputGroup className="h-11">
          <InputGroupAddon>
            <SearchIcon className="size-4" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            id="renewal-search"
            placeholder="Buscar aluno"
            defaultValue={query}
            onChange={(event) => {
              if (timer.current) clearTimeout(timer.current);
              const next = event.target.value.trim();
              timer.current = setTimeout(() => apply(next), 300);
            }}
          />
        </InputGroup>
      </Field>
      {query ? (
        <Button variant="ghost" className="min-h-11" onClick={handleClear}>
          <XIcon aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
