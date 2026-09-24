import Link from "next/link";
import { redirect } from "next/navigation";
import { enableGuardianAction } from "@/app/actions/family";
import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);
  const guardian = profile.capabilities.includes("guardian");
  const minor = profile.role === "minor_student";

  return (
    <PhaseOnePanel profile={profile} activePath={ROUTES.student} title={minor ? "Meu treino" : "Minha conta"} description={minor ? "Acompanhe sua graduação e sua ficha individual." : "Acompanhe sua matrícula e seus dados da academia."} items={minor ? [
      { title: "Minha graduação", description: "Consulte o status da sua ficha e sua faixa atual." },
      { title: "Meus treinos", description: "Presença e agenda serão liberadas nas fases seguintes." },
      { title: "Privacidade", description: "Você acessa apenas informações do seu próprio perfil." }
    ] : [
      { title: "Perfil", description: "Identidade única para cadastro, treinos e financeiro." },
      { title: "Segurança", description: "A senha pode ser recuperada pelo e-mail cadastrado." },
      { title: "Matrícula", description: "Preencha sua ficha, envie documentos e acompanhe a análise." }
    ]}>
      <Card><CardHeader><CardTitle className="text-base">Ficha do aluno</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
        <Button asChild><Link href={ROUTES.studentEnrollment}>{minor ? "Ver minha matrícula" : "Abrir minha matrícula"}</Link></Button>
        {!minor && (guardian ? <Button asChild variant="outline"><Link href={ROUTES.guardianDependents}>Gerenciar dependentes</Link></Button> : <form action={enableGuardianAction}><Button type="submit" variant="outline">Ativar perfil de responsável</Button></form>)}
      </CardContent></Card>
    </PhaseOnePanel>
  );
}
