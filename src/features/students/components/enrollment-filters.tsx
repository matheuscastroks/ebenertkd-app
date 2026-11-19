"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Award, Search, SlidersHorizontal, UsersRound } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBeltRanks } from "@/components/academy-config-provider";
import { beltNameOf } from "@/features/academy/belt-rules";
import { RankSelect } from "@/features/students/components/rank-select";
import type { TrainingClass } from "@/features/classes/types";
import { ROUTES } from "@/lib/navigation/routes";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "submitted", label: "Enviada" },
  { value: "under_review", label: "Em análise" },
  { value: "awaiting_signature", label: "Aguardando assinatura" },
  { value: "active", label: "Ativa" },
] as const;

type EnrollmentFilterKey = "q" | "status" | "rank" | "turma";
type EnrollmentFilterState = Record<EnrollmentFilterKey, string>;

const isSet = (value: string) => Boolean(value && value !== "all");

export function EnrollmentFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const ranks = useBeltRanks();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFilters: EnrollmentFilterState = {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    rank: searchParams.get("rank") ?? "",
    turma: searchParams.get("turma") ?? "",
  };
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(
    currentFilters,
    (state: EnrollmentFilterState, patch: Partial<EnrollmentFilterState>): EnrollmentFilterState => ({ ...state, ...patch })
  );

  useEffect(() => {
    const restore = () => {
      if (searchInput.current) {
        searchInput.current.value = new URLSearchParams(window.location.search).get("q") ?? "";
      }
    };
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const update = (name: EnrollmentFilterKey, value: string) => {
    const normalized = !value || value === "all" ? "" : value;
    const query = new URLSearchParams(window.location.search);
    if (!normalized) {
      query.delete(name);
    } else {
      query.set(name, normalized);
    }
    query.delete("page");
    if (name === "q" && !normalized && searchInput.current && document.activeElement !== searchInput.current) {
      searchInput.current.value = "";
    }
    startTransition(() => {
      setOptimisticFilters({ [name]: normalized });
      router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    });
  };

  const onSearchChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update("q", value.trim()), 300);
  };

  const handleClear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (searchInput.current) searchInput.current.value = "";
    startTransition(() => {
      setOptimisticFilters({ q: "", status: "", rank: "", turma: "" });
      router.replace(ROUTES.adminEnrollments, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    optimisticFilters.q ||
    isSet(optimisticFilters.status) ||
    isSet(optimisticFilters.rank) ||
    isSet(optimisticFilters.turma)
  );

  const activeCount = (["status", "rank", "turma"] as const).filter((key) => isSet(optimisticFilters[key])).length;
  return (
    <div aria-busy={pending} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="enrollment-search">Aluno</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon>
              <Search className="size-4" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInput}
              id="enrollment-search"
              placeholder="Buscar por nome"
              defaultValue={searchParams.get("q") ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </InputGroup>
        </Field>

        <Button type="button" variant="outline" className="min-h-11 sm:hidden" aria-expanded={expanded} aria-controls="enrollment-secondary-filters" onClick={() => setExpanded(!expanded)}>Filtros ({activeCount})</Button>
        <div id="enrollment-secondary-filters" className={`${expanded ? "grid" : "hidden"} gap-3 sm:grid sm:col-span-2 xl:col-span-3 xl:grid-cols-3`}>
        <Field>
          <FieldLabel htmlFor="enrollment-status">Status</FieldLabel>
          <Select
            value={optimisticFilters.status || "all"}
            onValueChange={(val) => update("status", val)}
          >
            <SelectTrigger id="enrollment-status" className="w-full h-11" leadingIcon={<SlidersHorizontal className="size-4" />}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="enrollment-rank">Graduação</FieldLabel>
          <RankSelect
            id="enrollment-rank"
            value={optimisticFilters.rank || "all"}
            onValueChange={(val) => update("rank", val)}
            allLabel="Todas as graduações"
            keep={optimisticFilters.rank}
            leadingIcon={<Award className="size-4" />}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="enrollment-class">Turma</FieldLabel>
          <Select
            value={optimisticFilters.turma || "all"}
            onValueChange={(val) => update("turma", val)}
          >
            <SelectTrigger id="enrollment-class" className="w-full h-11" leadingIcon={<UsersRound className="size-4" />}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((item) => (
                <SelectItem key={item.$id} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{(["status", "rank", "turma"] as const).filter((key) => isSet(optimisticFilters[key])).map((key) => <Button key={key} type="button" variant="outline" className="min-h-11" onClick={() => update(key, "all")}>Remover {key === "status" ? STATUS_OPTIONS.find((option) => option.value === optimisticFilters.status)?.label : key === "rank" ? beltNameOf(ranks, optimisticFilters.rank) : optimisticFilters[key]}</Button>)}</div>
      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
