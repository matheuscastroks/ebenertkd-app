import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationNext } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { listTrainingClasses } from "@/features/classes/service";
import { EnrollmentTable } from "@/features/students/components/enrollment-table";
import { listEnrollmentsForReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { BELT_OPTIONS } from "@/features/students/options";

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; belt?: string; turma?: string; cursor?: string }> }) {
  const admin = await requireProfile("admin");
  const filters = await searchParams;
  const status = filters.status === "all" ? undefined : filters.status;
  const belt = filters.belt === "all" ? undefined : filters.belt;
  const trainingClass = filters.turma === "all" ? undefined : filters.turma;
  const [result, classes] = await Promise.all([listEnrollmentsForReview({ search: filters.q, status, belt, trainingClass, cursor: filters.cursor }), listTrainingClasses(true)]);
  const nextParams = new URLSearchParams(Object.entries({ q: filters.q, status, belt, turma: trainingClass, cursor: result.nextCursor }).filter((entry): entry is [string, string] => Boolean(entry[1])));
  return (
    <PortalShell profile={admin} activePath={ROUTES.adminEnrollments} title="Matrículas" subtitle="Analise cadastros, documentos e condições financeiras.">
      <div className="mx-auto max-w-6xl space-y-5">
        <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-5">
          <Field><FieldLabel htmlFor="enrollment-search">Aluno</FieldLabel><Input id="enrollment-search" name="q" defaultValue={filters.q} placeholder="Buscar por nome" /></Field>
          <Field><FieldLabel htmlFor="enrollment-status">Status</FieldLabel><Select name="status" defaultValue={filters.status ?? "all"}><SelectTrigger id="enrollment-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="submitted">Enviada</SelectItem><SelectItem value="under_review">Em análise</SelectItem><SelectItem value="awaiting_signature">Aguardando assinatura</SelectItem><SelectItem value="active">Ativa</SelectItem></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="enrollment-belt">Faixa</FieldLabel><Select name="belt" defaultValue={filters.belt ?? "all"}><SelectTrigger id="enrollment-belt" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as faixas</SelectItem>{BELT_OPTIONS.map((belt) => <SelectItem key={belt} value={belt}>{belt}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="enrollment-class">Turma</FieldLabel><Select name="turma" defaultValue={filters.turma ?? "all"}><SelectTrigger id="enrollment-class" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as turmas</SelectItem>{classes.map((item) => <SelectItem key={item.$id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
          <div className="flex items-end gap-2"><Button type="submit" className="flex-1">Aplicar filtros</Button><Button asChild type="button" variant="outline"><Link href={ROUTES.adminEnrollments}>Limpar</Link></Button></div>
        </form>
        {result.rows.length === 0 ? <EmptyState title="Nenhuma matrícula encontrada" description="Ajuste os filtros ou aguarde o envio de uma nova ficha." action={<Button asChild variant="outline"><Link href={ROUTES.adminEnrollments}>Limpar filtros</Link></Button>} /> : <EnrollmentTable rows={result.rows} />}
        {result.nextCursor ? <Pagination><PaginationContent><PaginationItem><PaginationNext href={`${ROUTES.adminEnrollments}?${nextParams}`} text="Próxima página" /></PaginationItem></PaginationContent></Pagination> : null}
      </div>
    </PortalShell>
  );
}
