import { AlertCircle, LockKeyhole, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { loginAdultAction, loginMinorAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginCard({
  type,
  errorMessage
}: {
  type: "adult" | "minor";
  errorMessage?: string;
}) {
  const isMinor = type === "minor";
  const action = isMinor ? loginMinorAction : loginAdultAction;

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full border p-2">
              {isMinor ? <UserRound className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isMinor ? "Acesso do aluno menor" : "Acesso de adultos"}
              </h2>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form action={action} className="space-y-4">
          {isMinor ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium">Nome de usuário</span>
              <Input name="username" autoComplete="username" placeholder="ex.: joao.silva" required />
            </label>
          ) : (
            <label className="grid gap-2">
              <span className="text-sm font-medium">E-mail</span>
              <Input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
            </label>
          )}

          <label className="grid gap-2">
            <span className="text-sm font-medium">Senha</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input name="password" type="password" autoComplete="current-password" className="pl-9" placeholder="Sua senha" required />
            </div>
          </label>

          <Button type="submit" className="w-full">
            Entrar
          </Button>
          {!isMinor ? <Link href="/recuperar" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">Esqueci minha senha</Link> : null}
        </form>
      </CardContent>
    </Card>
  );
}
