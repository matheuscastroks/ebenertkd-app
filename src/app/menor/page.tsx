import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { requireProfile } from "@/lib/auth/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MinorPage() {
  const profile = await requireProfile("minor_student");
  return <PhaseOnePanel profile={profile} activePath="/menor" title="Meu treino" description="Área individual do aluno menor, sem informações financeiras ou de outros dependentes." items={[
    { title: "Minha graduação", description: "Consulte o status da sua ficha e sua faixa atual." },
    { title: "Meus treinos", description: "Presença e agenda serão liberadas nas fases seguintes." },
    { title: "Privacidade", description: "Você só acessa informações do seu próprio perfil." }
  ]}><Button asChild><Link href="/matricula">Ver minha matrícula</Link></Button></PhaseOnePanel>;
}
