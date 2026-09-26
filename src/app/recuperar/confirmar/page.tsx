import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { confirmRecoveryAction } from "@/app/actions/auth";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function ConfirmRecoveryPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string; secret?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isInvalid = params.error || !params.userId || !params.secret;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Image
            src="/brand-icon.png"
            alt="Ebener TKD"
            width={56}
            height={56}
            unoptimized
            className="mx-auto size-14 object-contain"
            priority
          />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Nova Senha de Acesso
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Defina sua nova credencial para acessar a plataforma.
          </p>
        </div>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {isInvalid ? "Link expirado ou inválido" : "Criar nova senha"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInvalid ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Este link de redefinição não é mais válido.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Links de recuperação expiram por segurança ou após o uso. Solicite um novo link abaixo.
                  </p>
                </div>
                <div className="pt-2">
                  <Button asChild className="w-full">
                    <Link href="/recuperar">Solicitar nova recuperação</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form action={confirmRecoveryAction} className="space-y-4">
                <input type="hidden" name="userId" value={params.userId} />
                <input type="hidden" name="secret" value={params.secret} />

                <Field>
                  <FieldLabel htmlFor="new-password">Nova senha segura</FieldLabel>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="new-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="Mínimo de 8 caracteres"
                      className="h-11 pl-9 text-sm"
                      required
                    />
                  </div>
                  <FieldDescription>
                    Escolha uma senha forte com pelo menos 8 caracteres.
                  </FieldDescription>
                </Field>

                <FormSubmitButton className="h-11 w-full text-sm font-semibold touch-manipulation" pendingLabel="Salvando nova senha…">
                  Salvar e entrar na conta
                </FormSubmitButton>
              </form>
            )}

            <div className="pt-2 border-t text-center">
              <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                <Link href="/">
                  <ArrowLeft className="size-3.5 mr-1" aria-hidden="true" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
