import Link from "next/link";
import { createExamEventAction } from "@/app/actions/exams";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listExamEvents } from "@/features/exams/service";
import { formatBrl } from "@/lib/money";
import { adminExamPath, ROUTES } from "@/lib/navigation/routes";
import { requireProfile } from "@/lib/auth/session";

const labels = { planned: "Planejado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" } as const;
const tones = { planned: "neutral", confirmed: "info", completed: "success", cancelled: "danger" } as const;

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  const [admin, events, query] = await Promise.all([requireProfile("admin"), listExamEvents(), searchParams]);
  return <PortalShell profile={admin} activePath={ROUTES.adminExams} title="Exames de faixa" subtitle="Organize inscrições, cobranças e resultados de graduação."><div className="w-full space-y-5">
    {query.cancelled ? <OperationToast tone="success" title="Exame cancelado" clearParams={["cancelled"]} /> : null}{query.error ? <OperationToast tone="error" title="Não foi possível criar o exame" description="Revise data, local e valor." clearParams={["error"]} /> : null}
    <div className="flex justify-end"><ResponsiveDialog trigger={<Button>Criar exame</Button>} title="Novo exame de faixa" description="O valor em reais será usado como padrão nas inscrições."><form action={createExamEventAction} className="grid gap-4 md:grid-cols-2"><Field className="md:col-span-2"><FieldLabel htmlFor="exam-name">Nome do evento</FieldLabel><Input id="exam-name" name="name" placeholder="Ex.: Exame de faixa — dezembro" required /></Field><DateField id="exam-date" name="event_date" label="Data do exame" required /><Field><FieldLabel htmlFor="exam-location">Local</FieldLabel><Input id="exam-location" name="location" placeholder="Dojang principal" /></Field><Field><FieldLabel htmlFor="exam-fee">Taxa por aluno (R$)</FieldLabel><Input id="exam-fee" name="default_fee_reais" type="number" inputMode="decimal" min="0" step="0.01" placeholder="150,00" required /></Field><div className="md:self-end"><FormSubmitButton pendingLabel="Criando exame…">Criar exame</FormSubmitButton></div></form></ResponsiveDialog></div>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold">Eventos</h2><p className="text-sm text-muted-foreground">Abra um evento para inscrever alunos e lançar resultados.</p></div>{events.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum exame cadastrado.</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{events.map((event) => <Card key={event.$id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{event.name}</CardTitle><CardDescription>{new Date(event.event_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {event.location ?? "Local a definir"}</CardDescription></div><StatusBadge tone={tones[event.status]}>{labels[event.status]}</StatusBadge></div></CardHeader><CardContent className="flex items-center justify-between gap-3"><p className="font-medium tabular-nums">{formatBrl(event.default_fee_cents)}</p><Button asChild><Link href={adminExamPath(event.$id)}>Gerenciar</Link></Button></CardContent></Card>)}</div>}</section>
  </div></PortalShell>;
}
