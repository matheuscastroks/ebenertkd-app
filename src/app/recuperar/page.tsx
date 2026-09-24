import Link from "next/link";
import { requestRecoveryAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Recuperar senha</CardTitle></CardHeader><CardContent className="space-y-4">
    {params.sent === "1" ? <p className="text-sm">Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.</p> : <form action={requestRecoveryAction} className="space-y-4"><label className="grid gap-2"><span className="text-sm font-medium">E-mail</span><Input name="email" type="email" required /></label><Button type="submit" className="w-full">Enviar instruções</Button></form>}
    <Button asChild variant="ghost" className="w-full"><Link href="/">Voltar</Link></Button>
  </CardContent></Card></main>;
}
