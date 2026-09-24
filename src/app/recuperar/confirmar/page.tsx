import { confirmRecoveryAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function ConfirmRecoveryPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Definir nova senha</CardTitle></CardHeader><CardContent>
    {params.error || !params.userId || !params.secret ? <p className="text-sm text-destructive">Este link é inválido ou expirou.</p> : <form action={confirmRecoveryAction} className="space-y-4"><input type="hidden" name="userId" value={params.userId} /><input type="hidden" name="secret" value={params.secret} /><label className="grid gap-2"><span className="text-sm font-medium">Nova senha</span><Input name="password" type="password" minLength={8} required /></label><Button type="submit" className="w-full">Salvar nova senha</Button></form>}
  </CardContent></Card></main>;
}
