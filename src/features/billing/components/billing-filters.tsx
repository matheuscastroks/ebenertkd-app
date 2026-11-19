"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { DownloadIcon } from "@/components/ui/download";
import { SearchIcon } from "@/components/ui/search";
import { XIcon } from "@/components/ui/x";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PixSettingsDialog } from "@/features/billing/components/pix-settings-dialog";
import { formatCompetence } from "@/features/billing/format-competence";
import type { BillingSettings } from "@/features/billing/types";
import type { TrainingClass } from "@/features/classes/types";
import { ROUTES } from "@/lib/navigation/routes";

const statusLabels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Inadimplente", cancelled: "Cancelado" } as const;
const typeLabels = { monthly_fee: "Mensalidade", enrollment_fee: "Matrícula", exam_fee: "Exame", event_fee: "Evento", exit_fee: "Saída" } as const;
const filterNames = { student: "aluno", competence: "competência", trainingClass: "turma", type: "tipo", status: "situação" } as const;
/** Filtros usados com menos frequência ficam recolhidos até o professor pedir. */
const secondaryKeys = ["competence", "trainingClass", "type"] as const;

type BillingFilterKey = "student" | "competence" | "trainingClass" | "type" | "status";
type BillingFilterState = Record<BillingFilterKey, string>;

const isSet = (value: string) => Boolean(value && value !== "all");

export function BillingFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const currentFilters: BillingFilterState = {
    status: searchParams.get("status") ?? "",
    trainingClass: searchParams.get("trainingClass") ?? "",
    type: searchParams.get("type") ?? "",
    competence: searchParams.get("competence") ?? "",
    student: searchParams.get("student") ?? "",
  };
  const [optimisticFilters, setOptimisticFilters] = useOptimistic(
    currentFilters,
    (state: BillingFilterState, patch: Partial<BillingFilterState>): BillingFilterState => ({ ...state, ...patch })
  );

  const secondaryActive = secondaryKeys.filter((key) => isSet(optimisticFilters[key])).length;
  const [expanded, setExpanded] = useState(secondaryActive > 0);
  const showSecondary = expanded || secondaryActive > 0;

  useEffect(() => {
    const restore = () => { if (studentInput.current) studentInput.current.value = new URLSearchParams(window.location.search).get("student") ?? ""; };
    window.addEventListener("popstate", restore);
    return () => { window.removeEventListener("popstate", restore); if (timer.current) clearTimeout(timer.current); };
  }, []);

  const update = (name: BillingFilterKey, value: string) => {
    const normalized = !value || value === "all" ? "" : value;
    const query = new URLSearchParams(window.location.search);
    if (!normalized) query.delete(name);
    else query.set(name, normalized);
    query.delete("page");
    if (name === "student" && !normalized && studentInput.current && document.activeElement !== studentInput.current) {
      studentInput.current.value = "";
    }
    startTransition(() => {
      setOptimisticFilters({ [name]: normalized });
      router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    });
  };
  const handleClear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (studentInput.current) studentInput.current.value = "";
    startTransition(() => {
      setOptimisticFilters({ student: "", competence: "", trainingClass: "", type: "", status: "" });
      router.replace(ROUTES.adminBilling, { scroll: false });
    });
  };
  const onStudentChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update("student", value.trim()), 300);
  };
  const active = (["student", "competence", "trainingClass", "type", "status"] as const).filter((key) => isSet(optimisticFilters[key]));
  const chipLabel = (key: (typeof active)[number]) => {
    const value = optimisticFilters[key];
    if (key === "status") return statusLabels[value as keyof typeof statusLabels] ?? value;
    if (key === "type") return typeLabels[value as keyof typeof typeLabels] ?? value;
    if (key === "trainingClass") return classes.find((item) => item.$id === value)?.name ?? value;
    if (key === "competence") return formatCompetence(value) === "—" ? value : formatCompetence(value);
    return value;
  };

  return <div role="search" aria-label="Filtrar cobranças" aria-busy={pending} className="space-y-3 transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
      <Field><FieldLabel htmlFor="billing-student">Aluno</FieldLabel><InputGroup className="h-10"><InputGroupAddon><SearchIcon className="size-4" aria-hidden="true" /></InputGroupAddon><InputGroupInput ref={studentInput} id="billing-student" placeholder="Buscar pelo nome" defaultValue={searchParams.get("student") ?? ""} onChange={(event) => onStudentChange(event.target.value)} /></InputGroup></Field>
      <Field><FieldLabel htmlFor="billing-status">Situação</FieldLabel><Select value={optimisticFilters.status || "all"} onValueChange={(value) => update("status", value)}><SelectTrigger id="billing-status" className="w-full"><SelectValue>{statusLabels[optimisticFilters.status as keyof typeof statusLabels] ?? "Todas"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Button type="button" variant="ghost" className="min-h-11 justify-start sm:min-h-10" aria-expanded={showSecondary} aria-controls="billing-secondary-filters" onClick={() => setExpanded(!showSecondary)} disabled={secondaryActive > 0}>
        <ChevronDownIcon className={`size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none ${showSecondary ? "-scale-y-100" : ""}`} aria-hidden="true" />
        Mais filtros{secondaryActive ? ` (${secondaryActive})` : ""}
      </Button>
    </div>
    {showSecondary ? <div id="billing-secondary-filters" className="t-panel-enter grid gap-3 sm:grid-cols-3">
      <Field><FieldLabel htmlFor="billing-competence">Competência</FieldLabel><Input id="billing-competence" type="text" inputMode="numeric" placeholder="AAAA-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" key={optimisticFilters.competence} defaultValue={optimisticFilters.competence} onBlur={(event) => { if (!event.target.value || event.target.validity.valid) update("competence", event.target.value); }} /></Field>
      <Field><FieldLabel htmlFor="billing-class">Turma</FieldLabel><Select value={optimisticFilters.trainingClass || "all"} onValueChange={(value) => update("trainingClass", value)}><SelectTrigger id="billing-class" className="w-full"><SelectValue>{classes.find((item) => item.$id === optimisticFilters.trainingClass)?.name ?? "Todas"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{classes.map((item) => <SelectItem key={item.$id} value={item.$id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="billing-type">Tipo</FieldLabel><Select value={optimisticFilters.type || "all"} onValueChange={(value) => update("type", value)}><SelectTrigger id="billing-type" className="w-full"><SelectValue>{typeLabels[optimisticFilters.type as keyof typeof typeLabels] ?? "Todos"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
    </div> : null}
    {active.length > 0 ? <div className="flex flex-wrap items-center gap-2">
      {active.map((key) => <Button key={key} size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => update(key, "")} aria-label={`Remover filtro ${filterNames[key]}`}>{chipLabel(key)}<XIcon aria-hidden="true" /></Button>)}
      <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-9" onClick={handleClear}>Limpar filtros</Button>
    </div> : null}
  </div>;
}

export function BillingToolbar({ settings }: { settings: BillingSettings | null }) {
  const searchParams = useSearchParams();
  const query = new URLSearchParams(searchParams.toString());
  query.delete("page");
  query.delete("pix");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" className="min-h-11">
        <Link href={ROUTES.adminBillingClosing}>Fechamento mensal</Link>
      </Button>
      <PixSettingsDialog settings={settings} />
      <Button asChild variant="outline" className="min-h-11">
        <Link href={`${ROUTES.adminBilling}/exportar?${query}`}>
          <DownloadIcon aria-hidden="true" />
          Exportar CSV
        </Link>
      </Button>
    </div>
  );
}
