import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/navigation/routes";

export default function EnrollmentNotFound() {
  return (
    <section className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Matrícula não encontrada</h1>
      <p className="text-muted-foreground">Confira o endereço ou selecione uma matrícula na lista de alunos.</p>
      <Button asChild><Link href={ROUTES.adminEnrollments}>Ver matrículas</Link></Button>
    </section>
  );
}
