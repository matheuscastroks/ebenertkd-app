import Link from "next/link";
import { Eye } from "lucide-react";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { beltForGub, type GubOption } from "@/features/students/options";
import type { Enrollment, Student } from "@/features/students/types";
import { adminEnrollmentPath } from "@/lib/navigation/routes";

export type EnrollmentRow = { student: Student; enrollment: Enrollment | null };

const status: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Rascunho", tone: "neutral" }, submitted: { label: "Enviada", tone: "info" }, under_review: { label: "Em análise", tone: "warning" }, awaiting_signature: { label: "Aguardando assinatura", tone: "warning" }, active: { label: "Ativa", tone: "success" }, paused: { label: "Pausada", tone: "neutral" }, cancelled: { label: "Cancelada", tone: "danger" }, awaiting_renewal: { label: "Aguardando renovação", tone: "warning" }
};

function belt(student: Student) {
  return student.gub ? beltForGub(student.gub as GubOption) : student.current_belt ?? "Não informada";
}

function EnrollmentStatus({ value }: { value?: string }) {
  const item = value ? status[value] : undefined;
  return <StatusBadge tone={item?.tone ?? "neutral"}>{item?.label ?? "Sem matrícula"}</StatusBadge>;
}

export function EnrollmentTable({ rows }: { rows: EnrollmentRow[] }) {
  return <ResponsiveDataView
    desktop={<div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Graduação</TableHead><TableHead>Turma</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{rows.map(({ student, enrollment }) => <TableRow key={student.$id}><TableCell className="font-medium">{student.full_name}</TableCell><TableCell>{belt(student)}</TableCell><TableCell>{student.training_class ?? "Não informada"}</TableCell><TableCell>{enrollment?.requested_due_day ? `Dia ${enrollment.requested_due_day}` : "—"}</TableCell><TableCell><EnrollmentStatus value={enrollment?.status} /></TableCell><TableCell className="text-right"><Button asChild size="sm"><Link href={adminEnrollmentPath(student.$id)}><Eye aria-hidden="true" />Analisar</Link></Button></TableCell></TableRow>)}</TableBody></Table></div>}
    mobile={rows.map(({ student, enrollment }) => <Card key={student.$id}><CardContent className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{student.full_name}</p><p className="mt-1 text-sm text-muted-foreground">{belt(student)} · {student.training_class ?? "Sem turma"}</p></div><EnrollmentStatus value={enrollment?.status} /></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Vencimento {enrollment?.requested_due_day ? `dia ${enrollment.requested_due_day}` : "não informado"}</span><Button asChild size="sm"><Link href={adminEnrollmentPath(student.$id)}>Analisar</Link></Button></div></CardContent></Card>)}
  />;
}
