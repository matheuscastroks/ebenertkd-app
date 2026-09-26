import { promoteMinorAction } from "@/app/actions/auth";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMinorProfiles } from "@/features/students/access-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentAccessPage({ searchParams }: { searchParams: Promise<{ promoted?: string; error?: string }> }) {
  const actor = await requireProfile("admin");
  const [minors, query] = await Promise.all([listMinorProfiles(), searchParams]);
  return <PortalShell profile={actor} activePath={ROUTES.adminStudentAccess} title="Acessos dos alunos" subtitle="Atualize o acesso quando um aluno passar a usar a própria conta." breadcrumbs={[{ label: "Matrículas", href: ROUTES.adminEnrollments }, { label: "Acessos" }]}>
    {query.promoted ? <OperationToast tone="success" title="Acesso atualizado" description="O aluno receberá um e-mail para definir a senha." clearParams={["promoted"]} /> : null}
    {query.error ? <OperationToast tone="error" title="Não foi possível atualizar o acesso" description="Confira o aluno e o e-mail informado." clearParams={["error"]} /> : null}
    <Card className="max-w-3xl"><CardHeader><CardTitle className="text-base">Acesso independente</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">Esta ação troca o e-mail de acesso, encerra as sessões atuais e envia um link para criar outra senha. Você pode manter o acesso de consulta do responsável.</p>
      {minors.length ? <form action={promoteMinorAction} className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="minor-profile">Aluno</FieldLabel><Select name="minor_profile_id" required><SelectTrigger id="minor-profile" className="w-full"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger><SelectContent>{minors.map((minor) => <SelectItem key={minor.$id} value={minor.$id}>{minor.full_name}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel htmlFor="new-email">Novo e-mail do aluno</FieldLabel><Input id="new-email" name="email" type="email" required /></Field><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="retain_guardian_access" /> Manter acesso de consulta do responsável</label><Button type="submit" className="sm:col-span-2 sm:justify-self-start">Atualizar acesso</Button></form> : <p className="text-sm text-muted-foreground">Nenhum aluno menor de idade com conta ativa.</p>}
    </CardContent></Card>
  </PortalShell>;
}
