"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { CalendarDays, SearchIcon, XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTES } from "@/lib/navigation/routes";

const BUCKET_OPTIONS = [
  { value: "all", label: "Em atenção (até 90 dias + vencidos)" },
  { value: "expired", label: "Já vencidos" },
  { value: "due_7d", label: "Vencem em até 7 dias" },
  { value: "due_30d", label: "Vencem em 8 a 30 dias" },
  { value: "due_60d", label: "Vencem em 31 a 60 dias" },
  { value: "due_90d", label: "Vencem em 61 a 90 dias" },
  { value: "healthy", label: "Vigentes (> 90 dias)" },
] as const;

type FilterKey = "q" | "bucket";
type FilterState = Record<FilterKey, string>;

export function RenewalFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const current: FilterState = {
    q: searchParams.get("q") ?? "",
    bucket: searchParams.get("bucket") ?? "",
  };

  const [optimistic, setOptimistic] = useOptimistic(
    current,
    (state: FilterState, patch: Partial<FilterState>): FilterState => ({ ...state, ...patch })
  );

  useEffect(() => {
    const restore = () => {
      if (inputRef.current) {
        inputRef.current.value = new URLSearchParams(window.location.search).get("q") ?? "";
      }
    };
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const update = (key: FilterKey, value: string) => {
    const normalized = !value || value === "all" ? "" : value;
    const query = new URLSearchParams(window.location.search);
    if (!normalized) query.delete(key);
    else query.set(key, normalized);
    startTransition(() => {
      setOptimistic({ [key]: normalized });
      router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    });
  };

  const handleClear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => {
      setOptimistic({ q: "", bucket: "" });
      router.replace(ROUTES.adminContractRenewals, { scroll: false });
    });
  };

  const bucketLabel =
    BUCKET_OPTIONS.find((item) => item.value === (optimistic.bucket || "all"))?.label ??
    "Em atenção (até 90 dias + vencidos)";

  return (
    <div
      role="search"
      aria-label="Filtrar renovações"
      aria-busy={pending}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="renewal-search">Aluno</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <SearchIcon className="size-4" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              id="renewal-search"
              placeholder="Buscar pelo nome"
              defaultValue={current.q}
              onChange={(event) => {
                if (timer.current) clearTimeout(timer.current);
                const next = event.target.value.trim();
                timer.current = setTimeout(() => update("q", next), 300);
              }}
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="renewal-bucket">Janela de vencimento</FieldLabel>
          <Select
            value={optimistic.bucket || "all"}
            onValueChange={(value) => update("bucket", value)}
          >
            <SelectTrigger id="renewal-bucket" className="h-10 w-full" leadingIcon={<CalendarDays className="size-4" />}>
              <SelectValue>{bucketLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {optimistic.q || optimistic.bucket ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" className="min-h-9" onClick={handleClear}>
            <XIcon aria-hidden="true" />
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
