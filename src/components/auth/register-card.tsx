import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { registerAdultAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterCard({ errorMessage, success }: { errorMessage?: string; success?: boolean }) {
  return (
    <Card><CardContent className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full border p-2"><UserPlus className="h-4 w-4" /></div>
        <div><h2 className="text-lg font-semibold">Criar conta</h2><p className="text-sm text-muted-foreground">Cadastre-se como aluno adulto ou responsável.</p></div>
      </div>
      {success ? <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4" /><span>Conta criada. Entre com seu e-mail e senha.</span></div> : null}
      {errorMessage ? <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4" /><span>{errorMessage}</span></div> : null}
      {!success ? (
        <form action={registerAdultAction} className="space-y-4">
          <label className="grid gap-2"><span className="text-sm font-medium">Nome completo</span><Input name="full_name" autoComplete="name" required /></label>
          <label className="grid gap-2"><span className="text-sm font-medium">E-mail</span><Input name="email" type="email" autoComplete="email" required /></label>
          <label className="grid gap-2"><span className="text-sm font-medium">Tipo de conta</span><select name="account_type" defaultValue="adult_student" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="adult_student">Aluno adulto</option><option value="guardian">Responsável</option></select></label>
          <label className="grid gap-2"><span className="text-sm font-medium">Senha</span><Input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <Button type="submit" className="w-full">Criar conta</Button>
        </form>
      ) : null}
    </CardContent></Card>
  );
}
