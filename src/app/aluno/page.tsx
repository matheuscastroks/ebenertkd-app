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
    { title: "Em breve", description: "Ficha de saúde, documentos e graduação na Fase 2." }
  ]}>
    <Card><CardHeader><CardTitle className="text-base">Também é responsável por um menor?</CardTitle></CardHeader><CardContent>
      {guardian ? <Button asChild><Link href="/responsavel">Gerenciar dependentes</Link></Button> : <form action={enableGuardianAction}><Button type="submit">Ativar perfil de responsável</Button></form>}
    </CardContent></Card>
  </PhaseOnePanel>;
}
