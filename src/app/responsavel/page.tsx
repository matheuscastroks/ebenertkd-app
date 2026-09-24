import { createMinorAction, resetMinorPasswordAction, revokeMinorSessionsAction } from "@/app/actions/family";
import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listGuardianMinors } from "@/features/families/service";
import { requireCapability } from "@/lib/auth/session";
import Link from "next/link";

export default async function GuardianPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const guardian = await requireCapability("guardian");
  const [minors, params] = await Promise.all([listGuardianMinors(guardian), searchParams]);
  return (
    <PhaseOnePanel name={guardian.full_name} badge="Responsável" title="Meus dependentes" description="Crie o acesso do menor e administre somente as contas vinculadas a você." items={[
      { title: "Dependentes", description: `${minors.length} aluno(s) vinculado(s) à sua conta.` },
      { title: "Acesso do menor", description: "O menor entra com nome de usuário e senha, sem usar e-mail." },
      { title: "Privacidade", description: "Financeiro e dados de outros dependentes não aparecem no acesso do menor." }
    ]}>
      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card><CardHeader><CardTitle className="text-base">Adicionar dependente</CardTitle></CardHeader><CardContent>
          {params.created === "1" ? <p className="mb-4 text-sm text-emerald-700">Acesso do menor criado.</p> : null}
          {params.error ? <p className="mb-4 text-sm text-destructive">Não foi possível concluir. Revise os dados e tente outro usuário.</p> : null}
          <form action={createMinorAction} className="space-y-4">
            <label className="grid gap-2"><span className="text-sm font-medium">Nome completo</span><Input name="full_name" required /></label>
            <label className="grid gap-2"><span className="text-sm font-medium">Nome de usuário</span><Input name="username" placeholder="ex.: maria.silva" minLength={3} required /></label>
            <label className="grid gap-2"><span className="text-sm font-medium">Senha inicial</span><Input name="password" type="password" minLength={8} required /></label>
            <Button type="submit">Criar acesso</Button>
          </form>
        </CardContent></Card>
        <div className="space-y-4">
          {minors.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum dependente cadastrado.</CardContent></Card> : minors.map((minor) => (
            <Card key={minor.$id}><CardHeader><CardTitle className="text-base">{minor.full_name}</CardTitle></CardHeader><CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Usuário: <strong className="text-foreground">{minor.username}</strong></p>
              <Button asChild><Link href={`/matricula?profile=${minor.$id}`}>Abrir ficha de matrícula</Link></Button>
              <form action={resetMinorPasswordAction} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="minor_profile_id" value={minor.$id} />
                <Input name="password" type="password" minLength={8} placeholder="Nova senha" required />
                <Button type="submit" variant="outline">Trocar senha</Button>
              </form>
              <form action={revokeMinorSessionsAction}>
                <input type="hidden" name="minor_profile_id" value={minor.$id} />
                <Button type="submit" variant="ghost">Desconectar em todos os aparelhos</Button>
              </form>
            </CardContent></Card>
          ))}
        </div>
      </section>
    </PhaseOnePanel>
  );
}
