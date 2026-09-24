import Link from "next/link";
import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listGuardianMinors } from "@/features/families/service";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);
  return (
    <PhaseOnePanel profile={guardian} activePath={ROUTES.guardian} title="Área do responsável" description="Acompanhe os alunos vinculados à sua conta." items={[
      { title: "Dependentes", description: `${minors.length} aluno(s) vinculado(s) à sua conta.` },
      { title: "Matrículas", description: "Preencha e acompanhe a ficha individual de cada dependente." },
      { title: "Privacidade", description: "Cada aluno acessa apenas as próprias informações." }
    ]}>
      <Card>
        <CardHeader><CardTitle className="text-base">Gestão dos dependentes</CardTitle></CardHeader>
        <CardContent><Button asChild><Link href={ROUTES.guardianDependents}>Abrir dependentes</Link></Button></CardContent>
      </Card>
    </PhaseOnePanel>
  );
}
