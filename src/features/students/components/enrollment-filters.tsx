"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BELT_OPTIONS } from "@/features/students/options";
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

export function EnrollmentFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const update = (name: string, value: string) => {
    const query = new URLSearchParams(window.location.search);
    if (!value || value === "all") {
      query.delete(name);
    } else {
      query.set(name, value);
    }
    query.delete("page");
    router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
  };

  const onSearchChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update("q", value.trim()), 300);
  };

  const handleClear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (searchInput.current) searchInput.current.value = "";
    router.replace(ROUTES.adminEnrollments, { scroll: false });
  };

  const hasActiveFilters = Boolean(
    searchParams.get("q") ||
    (searchParams.get("status") && searchParams.get("status") !== "all") ||
    (searchParams.get("belt") && searchParams.get("belt") !== "all") ||
    (searchParams.get("turma") && searchParams.get("turma") !== "all")
  );

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-card p-4 depth-raised">
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

        <Field>
          <FieldLabel htmlFor="enrollment-status">Status</FieldLabel>
          <Select
            value={searchParams.get("status") ?? "all"}
            onValueChange={(val) => update("status", val)}
          >
            <SelectTrigger id="enrollment-status" className="w-full h-11">
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
          <FieldLabel htmlFor="enrollment-belt">Faixa</FieldLabel>
          <Select
            value={searchParams.get("belt") ?? "all"}
            onValueChange={(val) => update("belt", val)}
          >
            <SelectTrigger id="enrollment-belt" className="w-full h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as faixas</SelectItem>
              {BELT_OPTIONS.map((belt) => (
                <SelectItem key={belt} value={belt}>
                  {belt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="enrollment-class">Turma</FieldLabel>
          <Select
            value={searchParams.get("turma") ?? "all"}
            onValueChange={(val) => update("turma", val)}
          >
            <SelectTrigger id="enrollment-class" className="w-full h-11">
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
