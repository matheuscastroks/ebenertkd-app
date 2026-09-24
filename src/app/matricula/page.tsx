import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listGuardianMinors } from "@/features/families/service";
import { resolveStudentProfile } from "@/features/students/access";
import { EnrollmentForm } from "@/features/students/components/enrollment-form";
import { getOrCreateEnrollmentBundle } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";

export default async function EnrollmentPage({ searchParams }: { searchParams: Promise<{ profile?: string; saved?: string; submitted?: string; error?: string }> }) {
  const [actor, params] = await Promise.all([requireProfile(), searchParams]);
  if (actor.role === "minor_student") {
    const bundle = await getOrCreateEnrollmentBundle(actor, actor);
    return <main className="mx-auto max-w-3xl p-5 md:p-8"><Card><CardHeader><CardTitle>Minha matrícula</CardTitle></CardHeader><CardContent className="space-y-2"><p><strong>Status:</strong> {bundle.enrollment.status.replaceAll("_", " ")}</p><p><strong>Faixa:</strong> {bundle.student.current_belt ?? "Ainda não informada"}</p><p className="text-sm text-muted-foreground">Seu responsável administra dados de saúde, documentos e informações financeiras.</p></CardContent></Card></main>;
  }
  if (actor.capabilities.includes("guardian") && !actor.capabilities.includes("student") && !params.profile) {
    const minors = await listGuardianMinors(actor);
    return <main className="mx-auto max-w-3xl space-y-5 p-5 md:p-8"><div><h1 className="text-2xl font-semibold">Escolha o aluno</h1><p className="text-muted-foreground">Abra a ficha que deseja preencher ou acompanhar.</p></div>{minors.map((minor) => <Card key={minor.$id}><CardContent className="flex items-center justify-between gap-3 p-5"><span className="font-medium">{minor.full_name}</span><Button asChild><Link href={`/matricula?profile=${minor.$id}`}>Abrir ficha</Link></Button></CardContent></Card>)}</main>;
  }
  const target = await resolveStudentProfile(actor, params.profile);
  const bundle = await getOrCreateEnrollmentBundle(target, actor);
  const message = params.saved ? "Rascunho salvo." : params.submitted ? "Ficha enviada para análise." : params.error ? "Não foi possível salvar. Revise os campos e arquivos." : undefined;
  return <main className="mx-auto max-w-5xl p-5 md:p-8"><EnrollmentForm bundle={bundle} targetProfileId={target.$id} message={message} /></main>;
}
