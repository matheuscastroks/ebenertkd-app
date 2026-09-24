import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { listEnrollmentsForReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; belt?: string; turma?: string; cursor?: string }> }) {
  const admin = await requireProfile("admin");
  const filters = await searchParams;
  const result = await listEnrollmentsForReview({ search: filters.q, status: filters.status, belt: filters.belt, trainingClass: filters.turma, cursor: filters.cursor });
  return (
    <PortalShell profile={admin} activePath={ROUTES.adminEnrollments} title="Matrículas" subtitle="Analise cadastros, documentos e condições financeiras.">
      <div className="mx-auto max-w-6xl space-y-5">
        <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
          <Input name="q" defaultValue={filters.q} placeholder="Buscar por nome" />
          <select name="status" defaultValue={filters.status ?? ""} className="h-8 rounded-lg border bg-background px-2"><option value="">Todos os status</option><option value="draft">Rascunho</option><option value="submitted">Enviado</option><option value="under_review">Em análise</option><option value="awaiting_signature">Aguardando assinatura</option></select>
          <Input name="belt" defaultValue={filters.belt} placeholder="Faixa" />
          <Input name="turma" defaultValue={filters.turma} placeholder="Turma / horário" />
          <Button type="submit">Filtrar</Button>
        </form>
        <div className="space-y-3">
          {result.rows.length === 0 ? <Card><CardContent className="p-5 text-sm text-muted-foreground">Nenhuma matrícula encontrada.</CardContent></Card> : result.rows.map(({ student, enrollment }) => (
            <Card key={student.$id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{student.full_name}</p><p className="text-sm text-muted-foreground">{student.current_belt ?? "Faixa não informada"} · {student.training_class ?? "Turma não informada"} · vencimento solicitado: {enrollment?.requested_due_day ?? "—"}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{enrollment?.status.replaceAll("_", " ") ?? "sem matrícula"}</Badge><Button asChild><Link href={adminEnrollmentPath(student.$id)}>Analisar</Link></Button></div></CardContent></Card>
          ))}
        </div>
        {result.nextCursor ? <Button asChild variant="outline"><Link href={`${ROUTES.adminEnrollments}?cursor=${result.nextCursor}`}>Próxima página</Link></Button> : null}
      </div>
    </PortalShell>
  );
}
