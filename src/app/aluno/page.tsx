import Link from "next/link";
import { enableGuardianAction } from "@/app/actions/family";
import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/session";

export default async function StudentPage() {
  const profile = await requireProfile("adult_student");
  const guardian = profile.capabilities.includes("guardian");
  return <PhaseOnePanel name={profile.full_name} badge="Aluno adulto" title="Minha conta" description="Sua sessão está ativa e protegida pelo Appwrite." items={[
    { title: "Perfil", description: "Identidade única para cadastro, treinos e financeiro." },
    { title: "Segurança", description: "A senha pode ser recuperada pelo e-mail cadastrado." },
    { title: "Matrícula", description: "Preencha sua ficha, envie documentos e acompanhe a análise." }
  ]}>
    <Card><CardHeader><CardTitle className="text-base">Ficha do aluno</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
      <Button asChild><Link href="/matricula">Abrir minha matrícula</Link></Button>
      {guardian ? <Button asChild variant="outline"><Link href="/responsavel">Gerenciar dependentes</Link></Button> : <form action={enableGuardianAction}><Button type="submit" variant="outline">Ativar perfil de responsável</Button></form>}
    </CardContent></Card>
  </PhaseOnePanel>;
}
