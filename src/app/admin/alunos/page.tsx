import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listEnrollmentsForReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; belt?: string; turma?: string; cursor?: string }> }) {
  await requireProfile("admin");
  const filters = await searchParams;
  const result = await listEnrollmentsForReview({ search: filters.q, status: filters.status, belt: filters.belt, trainingClass: filters.turma, cursor: filters.cursor });
  return <main className="mx-auto max-w-6xl space-y-5 p-5 md:p-8"><div><Link href="/admin" className="text-sm text-muted-foreground underline">Voltar ao painel</Link><h1 className="mt-2 text-2xl font-semibold">Matrículas</h1><p className="text-muted-foreground">Analise cadastros, documentos e condições financeiras.</p></div><form className="grid gap-3 rounded-xl border p-4 md:grid-cols-5"><Input name="q" defaultValue={filters.q} placeholder="Buscar por nome" /><select name="status" defaultValue={filters.status ?? ""} className="h-8 rounded-lg border bg-background px-2"><option value="">Todos os status</option><option value="draft">Rascunho</option><option value="submitted">Enviado</option><option value="under_review">Em análise</option><option value="awaiting_signature">Aguardando assinatura</option></select><Input name="belt" defaultValue={filters.belt} placeholder="Faixa" /><Input name="turma" defaultValue={filters.turma} placeholder="Turma / horário" /><Button type="submit">Filtrar</Button></form><div className="space-y-3">{result.rows.length === 0 ? <Card><CardContent className="p-5 text-sm text-muted-foreground">Nenhuma matrícula encontrada.</CardContent></Card> : result.rows.map(({ student, enrollment }) => <Card key={student.$id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{student.full_name}</p><p className="text-sm text-muted-foreground">{student.current_belt ?? "Faixa não informada"} · {student.training_class ?? "Turma não informada"} · vencimento solicitado: {enrollment?.requested_due_day ?? "—"}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{enrollment?.status.replaceAll("_", " ") ?? "sem matrícula"}</Badge><Button asChild><Link href={`/admin/alunos/${student.$id}`}>Analisar</Link></Button></div></CardContent></Card>)}</div>{result.nextCursor ? <Button asChild variant="outline"><Link href={`/admin/alunos?cursor=${result.nextCursor}`}>Próxima página</Link></Button> : null}</main>;
}
