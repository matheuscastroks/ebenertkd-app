import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { promoteMinorAction } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminPage() {
  const profile = await requireProfile("admin");
  return <PhaseOnePanel profile={profile} activePath="/admin" title="Painel administrativo" description="Acompanhe matrículas, turmas e a operação da academia." items={[
    { title: "Contas", description: "Papéis e sessões estão isolados por perfil." },
    { title: "Auditoria", description: "Criações e ações sensíveis geram eventos internos." },
    { title: "Próxima etapa", description: "Cadastro e aprovação das fichas dos alunos." }
  ]}>
    <Card><CardHeader><CardTitle className="text-base">Matrículas de alunos</CardTitle></CardHeader><CardContent><Button asChild><Link href={ROUTES.adminEnrollments}>Abrir análise de matrículas</Link></Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Transição para conta adulta</CardTitle></CardHeader><CardContent>
      <form action={promoteMinorAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input name="minor_profile_id" placeholder="ID do perfil do aluno" required />
        <Input name="email" type="email" placeholder="Novo e-mail do aluno" required />
        <Button type="submit">Converter conta</Button>
        <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="retain_guardian_access" /> Manter o vínculo de consulta do responsável</label>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">A conversão remove o usuário infantil, encerra as sessões e envia ao novo e-mail o link para definir outra senha.</p>
    </CardContent></Card>
  </PhaseOnePanel>;
}
