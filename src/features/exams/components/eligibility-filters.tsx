"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { SearchIcon } from "@/components/ui/search";
import { XIcon } from "@/components/ui/x";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrainingClass } from "@/features/classes/types";
import { GUB_BELT_OPTIONS } from "@/features/students/options";
import { ROUTES } from "@/lib/navigation/routes";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "eligible", label: "Aptos para exame" },
  { value: "almost_ready", label: "Quase prontos (≥ 75%)" },
  { value: "financial_hold", label: "Pendência financeira" },
  { value: "already_registered", label: "Já inscritos" },
  { value: "in_progress", label: "Em carência" },
] as const;

type FilterKey = "q" | "status" | "turma" | "gub";
type FilterState = Record<FilterKey, string>;

export function EligibilityFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const current: FilterState = {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    turma: searchParams.get("turma") ?? "",
    gub: searchParams.get("gub") ?? "",
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
      setOptimistic({ q: "", status: "", turma: "", gub: "" });
      router.replace(ROUTES.adminExamEligibility, { scroll: false });
    });
  };

  const hasFilters = Boolean(
    optimistic.q || optimistic.status || optimistic.turma || optimistic.gub
  );

  const statusLabel =
    STATUS_OPTIONS.find((item) => item.value === (optimistic.status || "all"))?.label ??
    "Todos os status";
  const classLabel =
    classes.find((item) => item.$id === optimistic.turma)?.name ?? "Todas as turmas";
  const gubLabel =
    GUB_BELT_OPTIONS.find((item) => String(item.gub) === optimistic.gub)?.belt ??
    "Todas as faixas";

  return (
    <div
      role="search"
      aria-label="Filtrar elegibilidade"
      aria-busy={pending}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="eligibility-search">Aluno</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <SearchIcon className="size-4" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              id="eligibility-search"
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
          <FieldLabel htmlFor="eligibility-status">Aptidão</FieldLabel>
          <Select value={optimistic.status || "all"} onValueChange={(value) => update("status", value)}>
            <SelectTrigger id="eligibility-status" className="h-11 w-full">
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="eligibility-belt">Faixa atual</FieldLabel>
          <Select value={optimistic.gub || "all"} onValueChange={(value) => update("gub", value)}>
            <SelectTrigger id="eligibility-belt" className="h-11 w-full">
              <SelectValue>{gubLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as faixas</SelectItem>
              {GUB_BELT_OPTIONS.map((item) => (
                <SelectItem key={item.gub} value={String(item.gub)}>
                  {item.belt} ({item.gub}º GUB)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="eligibility-class">Turma</FieldLabel>
          <Select value={optimistic.turma || "all"} onValueChange={(value) => update("turma", value)}>
            <SelectTrigger id="eligibility-class" className="h-11 w-full">
              <SelectValue>{classLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((item) => (
                <SelectItem key={item.$id} value={item.$id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {hasFilters ? (
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
