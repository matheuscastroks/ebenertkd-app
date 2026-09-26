import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChargeActions } from "@/features/billing/components/charge-actions";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import type { Charge, Payment, PaymentProof } from "@/features/billing/types";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const statuses: Record<string, { label: string; tone: StatusTone }> = { pending: { label: "Pendente", tone: "warning" }, proof_under_review: { label: "Em análise", tone: "info" }, paid: { label: "Pago", tone: "success" }, overdue: { label: "Inadimplente", tone: "danger" }, cancelled: { label: "Cancelado", tone: "neutral" } };

function BillingStatus({ value }: { value: string }) { const item = statuses[value] ?? { label: value, tone: "neutral" as const }; return <StatusBadge tone={item.tone}>{item.label}</StatusBadge>; }

export function BillingTable({ charges, names, photosByStudent, proofsByCharge, payments }: { charges: Charge[]; names: Map<string, string>; photosByStudent: Map<string, string>; proofsByCharge: Map<string, PaymentProof>; payments: Payment[] }) {
  const action = (charge: Charge) => <ChargeActions charge={charge} studentName={names.get(charge.student_id) ?? "Aluno"} proof={proofsByCharge.get(charge.$id)} payment={payments.find((item) => item.charge_id === charge.$id && item.status === "confirmed")} />;
  return <ResponsiveDataView
    desktop={<div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Competência</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{charges.map((charge) => <TableRow key={charge.$id}><TableCell><div className="flex items-center gap-3"><StudentAvatar name={names.get(charge.student_id) ?? "Aluno"} photoDocumentId={photosByStudent.get(charge.student_id)} size="sm" /><div><p className="font-medium">{names.get(charge.student_id) ?? "Aluno"}</p><p className="text-xs text-muted-foreground">{charge.description}</p></div></div></TableCell><TableCell>{charge.competence}</TableCell><TableCell>{new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</TableCell><TableCell className="font-medium tabular-nums">{money(charge.amount_cents)}</TableCell><TableCell><BillingStatus value={charge.status} /></TableCell><TableCell>{action(charge)}</TableCell></TableRow>)}</TableBody></Table></div>}
    mobile={charges.map((charge) => <Card key={charge.$id}><CardContent className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><StudentAvatar name={names.get(charge.student_id) ?? "Aluno"} photoDocumentId={photosByStudent.get(charge.student_id)} size="sm" /><div><p className="font-medium">{names.get(charge.student_id) ?? "Aluno"}</p><p className="text-sm text-muted-foreground">{charge.description}</p></div></div><BillingStatus value={charge.status} /></div><div className="flex items-end justify-between gap-3"><div><p className="text-xl font-semibold tabular-nums">{money(charge.amount_cents)}</p><p className="text-xs text-muted-foreground">Vence {new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div>{action(charge)}</div></CardContent></Card>)}
  />;
}
