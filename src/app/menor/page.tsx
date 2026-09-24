import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { requireProfile } from "@/lib/auth/session";

export default async function MinorPage() {
  const profile = await requireProfile("minor_student");
  return <PhaseOnePanel name={profile.full_name} badge="Aluno" title="Meu treino" description="Área individual do aluno menor, sem informações financeiras ou de outros dependentes." items={[
    { title: "Minha graduação", description: "Será preenchida na ficha do aluno na Fase 2." },
    { title: "Meus treinos", description: "Presença e agenda serão liberadas nas fases seguintes." },
    { title: "Privacidade", description: "Você só acessa informações do seu próprio perfil." }
  ]} />;
}
