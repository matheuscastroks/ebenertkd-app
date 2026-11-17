"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PixSettingsDialog } from "@/features/billing/components/pix-settings-dialog";
import type { BillingSettings } from "@/features/billing/types";
import type { TrainingClass } from "@/features/classes/types";
import { ROUTES } from "@/lib/navigation/routes";

const statusLabels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Inadimplente", cancelled: "Cancelado" } as const;

export function BillingFilters({ classes }: { classes: TrainingClass[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const active = ["student", "competence", "trainingClass", "type", "status"].filter((key) => searchParams.get(key) && searchParams.get(key) !== "all");

  return <div className="space-y-3 rounded-xl border border-border/50 bg-card p-4 shadow-xs">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Field><FieldLabel htmlFor="billing-student">Aluno</FieldLabel><InputGroup className="h-10"><InputGroupAddon><Search className="size-4" aria-hidden="true" /></InputGroupAddon><InputGroupInput ref={studentInput} id="billing-student" placeholder="Buscar pelo nome" defaultValue={searchParams.get("student") ?? ""} onChange={(event) => onStudentChange(event.target.value)} /></InputGroup></Field>
      <Field><FieldLabel htmlFor="billing-competence">Competência</FieldLabel><Input id="billing-competence" type="text" inputMode="numeric" placeholder="AAAA-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" key={searchParams.get("competence") ?? ""} defaultValue={searchParams.get("competence") ?? ""} onBlur={(event) => { if (!event.target.value || event.target.validity.valid) update("competence", event.target.value); }} /></Field>
      <Field><FieldLabel htmlFor="billing-class">Turma</FieldLabel><Select value={searchParams.get("trainingClass") ?? "all"} onValueChange={(value) => update("trainingClass", value)}><SelectTrigger id="billing-class" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{classes.map((item) => <SelectItem key={item.$id} value={item.$id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="billing-type">Tipo</FieldLabel><Select value={searchParams.get("type") ?? "all"} onValueChange={(value) => update("type", value)}><SelectTrigger id="billing-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="monthly_fee">Mensalidade</SelectItem><SelectItem value="enrollment_fee">Matrícula</SelectItem><SelectItem value="exam_fee">Exame</SelectItem><SelectItem value="exit_fee">Saída</SelectItem></SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="billing-status">Situação</FieldLabel><Select value={searchParams.get("status") ?? "all"} onValueChange={(value) => update("status", value)}><SelectTrigger id="billing-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
    </div>
    <div className="flex flex-wrap items-center justify-end gap-2">{active.map((key) => <Button key={key} size="sm" variant="outline" onClick={() => update(key, "")} aria-label={`Remover filtro ${key}`}>{key === "status" ? statusLabels[searchParams.get(key) as keyof typeof statusLabels] : key === "trainingClass" ? classes.find((item) => item.$id === searchParams.get(key))?.name : searchParams.get(key)} ×</Button>)}{active.length > 0 ? <Button type="button" variant="ghost" onClick={() => { if (timer.current) clearTimeout(timer.current); if (studentInput.current) studentInput.current.value = ""; router.replace(ROUTES.adminBilling, { scroll: false }); }}>Limpar filtros</Button> : null}</div>
  </div>;
}

export function BillingToolbar({ settings }: { settings: BillingSettings | null }) {
 const searchParams = useSearchParams(); const query = new URLSearchParams(searchParams.toString()); query.delete("page");
 return <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`${ROUTES.adminBilling}/exportar?${query}`}>Exportar CSV</Link></Button><PixSettingsDialog settings={settings} /></div>;
}
