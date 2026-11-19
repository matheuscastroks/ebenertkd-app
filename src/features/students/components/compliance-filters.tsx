"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { FileCheck, SearchIcon, UsersRound, XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrainingClass } from "@/features/classes/types";
import { ROUTES } from "@/lib/navigation/routes";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "expired", label: "Vencidos (> 12 meses)" },
  { value: "missing", label: "Pendentes / Recusados" },
  { value: "pending_review", label: "Aguardando análise" },
  { value: "expiring_soon", label: "Vencem em até 30 dias" },
  { value: "valid", label: "Em dia" },
] as const;

type FilterKey = "q" | "status" | "turma";
type FilterState = Record<FilterKey, string>;

export function ComplianceFilters({ classes }: { classes: TrainingClass[] }) {
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
      setOptimistic({ q: "", status: "", turma: "" });
      router.replace(ROUTES.adminCompliance, { scroll: false });
    });
  };

  const statusLabel =
    STATUS_OPTIONS.find((item) => item.value === (optimistic.status || "all"))?.label ??
    "Todos os status";
  const classLabel =
    classes.find((item) => item.$id === optimistic.turma)?.name ?? "Todas as turmas";

  return (
    <div
      role="search"
      aria-label="Filtrar regularidade anual"
      aria-busy={pending}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="compliance-search">Aluno</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <SearchIcon className="size-4" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              id="compliance-search"
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
          <FieldLabel htmlFor="compliance-status">Situação do atestado</FieldLabel>
          <Select
            value={optimistic.status || "all"}
            onValueChange={(value) => update("status", value)}
          >
            <SelectTrigger id="compliance-status" className="h-11 w-full" leadingIcon={<FileCheck className="size-4" />}>
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
          <FieldLabel htmlFor="compliance-class">Turma</FieldLabel>
          <Select
            value={optimistic.turma || "all"}
            onValueChange={(value) => update("turma", value)}
          >
            <SelectTrigger id="compliance-class" className="h-11 w-full" leadingIcon={<UsersRound className="size-4" />}>
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

      {optimistic.q || optimistic.status || optimistic.turma ? (
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
