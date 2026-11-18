"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Ellipsis, Search, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
const typeLabels = { monthly_fee: "Mensalidade", enrollment_fee: "Matrícula", exam_fee: "Exame", exit_fee: "Saída" } as const;
const filterNames = { student: "aluno", competence: "competência", trainingClass: "turma", type: "tipo", status: "situação" } as const;
/** Filtros usados com menos frequência ficam recolhidos até o professor pedir. */
const secondaryKeys = ["competence", "trainingClass", "type"] as const;

export function BillingFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondaryActive = secondaryKeys.filter((key) => searchParams.get(key) && searchParams.get(key) !== "all").length;
  const [expanded, setExpanded] = useState(secondaryActive > 0);
  const showSecondary = expanded || secondaryActive > 0;

  useEffect(() => {
    const restore = () => { if (studentInput.current) studentInput.current.value = new URLSearchParams(window.location.search).get("student") ?? ""; };
    window.addEventListener("popstate", restore);
    return () => { window.removeEventListener("popstate", restore); if (timer.current) clearTimeout(timer.current); };
  }, []);

  const update = (name: string, value: string) => {
    const query = new URLSearchParams(window.location.search);
    if (!value || value === "all") query.delete(name);
    else query.set(name, value);
    query.delete("page");
    router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
  };
  const onStudentChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update("student", value.trim()), 300);
  };
  const active = (["student", "competence", "trainingClass", "type", "status"] as const).filter((key) => searchParams.get(key) && searchParams.get(key) !== "all");
  const chipLabel = (key: (typeof active)[number]) => {
    const value = searchParams.get(key) ?? "";
    if (key === "status") return statusLabels[value as keyof typeof statusLabels] ?? value;
    if (key === "type") return typeLabels[value as keyof typeof typeLabels] ?? value;
    if (key === "trainingClass") return classes.find((item) => item.$id === value)?.name ?? value;
    if (key === "competence") return formatCompetence(value) === "—" ? value : formatCompetence(value);
    return value;
  };

  return <div role="search" aria-label="Filtrar cobranças" className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
      <Field><FieldLabel htmlFor="billing-student">Aluno</FieldLabel><InputGroup className="h-10"><InputGroupAddon><Search className="size-4" aria-hidden="true" /></InputGroupAddon><InputGroupInput ref={studentInput} id="billing-student" placeholder="Buscar pelo nome" defaultValue={searchParams.get("student") ?? ""} onChange={(event) => onStudentChange(event.target.value)} /></InputGroup></Field>
      <Field><FieldLabel htmlFor="billing-status">Situação</FieldLabel><Select value={searchParams.get("status") ?? "all"} onValueChange={(value) => update("status", value)}><SelectTrigger id="billing-status" className="w-full"><SelectValue>{statusLabels[searchParams.get("status") as keyof typeof statusLabels] ?? "Todas"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Button type="button" variant="ghost" className="min-h-11 justify-start sm:min-h-10" aria-expanded={showSecondary} aria-controls="billing-secondary-filters" onClick={() => setExpanded(!showSecondary)} disabled={secondaryActive > 0}>
        <ChevronDown className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${showSecondary ? "rotate-180" : ""}`} aria-hidden="true" />
        Mais filtros{secondaryActive ? ` (${secondaryActive})` : ""}
      </Button>
    </div>
    {showSecondary ? <div id="billing-secondary-filters" className="grid gap-3 sm:grid-cols-3">
      <Field><FieldLabel htmlFor="billing-competence">Competência</FieldLabel><Input id="billing-competence" type="text" inputMode="numeric" placeholder="AAAA-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" key={searchParams.get("competence") ?? ""} defaultValue={searchParams.get("competence") ?? ""} onBlur={(event) => { if (!event.target.value || event.target.validity.valid) update("competence", event.target.value); }} /></Field>
      <Field><FieldLabel htmlFor="billing-class">Turma</FieldLabel><Select value={searchParams.get("trainingClass") ?? "all"} onValueChange={(value) => update("trainingClass", value)}><SelectTrigger id="billing-class" className="w-full"><SelectValue>{classes.find((item) => item.$id === searchParams.get("trainingClass"))?.name ?? "Todas"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{classes.map((item) => <SelectItem key={item.$id} value={item.$id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="billing-type">Tipo</FieldLabel><Select value={searchParams.get("type") ?? "all"} onValueChange={(value) => update("type", value)}><SelectTrigger id="billing-type" className="w-full"><SelectValue>{typeLabels[searchParams.get("type") as keyof typeof typeLabels] ?? "Todos"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
    </div> : null}
    {active.length > 0 ? <div className="flex flex-wrap items-center gap-2">
      {active.map((key) => <Button key={key} size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => update(key, "")} aria-label={`Remover filtro ${filterNames[key]}`}>{chipLabel(key)}<X aria-hidden="true" /></Button>)}
      <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-9" onClick={() => { if (timer.current) clearTimeout(timer.current); if (studentInput.current) studentInput.current.value = ""; router.replace(ROUTES.adminBilling, { scroll: false }); }}>Limpar filtros</Button>
    </div> : null}
  </div>;
}

export function BillingToolbar({ settings }: { settings: BillingSettings | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = new URLSearchParams(searchParams.toString());
  query.delete("page");
  query.delete("pix");
  const openPix = () => {
    const next = new URLSearchParams(window.location.search);
    next.set("pix", "1");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  // Sem PIX configurado o botão fica à vista: alunos não conseguem pagar sem ele.
  if (!settings) return <div className="flex flex-wrap gap-2"><PixSettingsDialog settings={settings} /><Button asChild variant="ghost" className="min-h-11"><Link href={`${ROUTES.adminBilling}/exportar?${query}`}><Download aria-hidden="true" />Exportar CSV</Link></Button></div>;
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" className="min-h-11"><Ellipsis aria-hidden="true" />Mais ações</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={openPix}><Settings2 aria-hidden="true" />Configurar PIX</DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`${ROUTES.adminBilling}/exportar?${query}`}><Download aria-hidden="true" />Exportar CSV</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <PixSettingsDialog settings={settings} trigger={<span hidden />} />
  </>;
}
