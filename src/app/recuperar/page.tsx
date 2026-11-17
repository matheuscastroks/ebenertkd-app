import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requestRecoveryAction } from "@/app/actions/auth";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function RecoveryPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

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
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-sm text-muted-foreground sm:text-sm">
            Informe o e-mail da sua conta para receber o link de redefinição.
          </p>
        </div>

        <Card className="border-border/80 shadow-xs">
          <CardContent className="space-y-4">
            {params.sent === "1" ? (
              <OperationToast
                tone="success"
                title="Instruções solicitadas"
                description="Se o e-mail estiver cadastrado, você receberá as instruções em instantes. Verifique também a pasta de spam."
                clearParams={["sent"]}
              />
            ) : null}

            <form action={requestRecoveryAction} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="recovery-email">Seu e-mail cadastrado</FieldLabel>
                <div className="relative">

                  <Input
                    id="recovery-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.email@exemplo.com"
                    className="h-11 text-sm"
                    required
                  />
                </div>
              </Field>

              <FormSubmitButton className="h-11 w-full text-sm font-semibold touch-manipulation" pendingLabel="Enviando instruções…">
                Enviar link de recuperação
              </FormSubmitButton>
            </form>

            <div className="pt-2 border-t text-center">
              <Button asChild variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                <Link href="/">
                  <ArrowLeft className="size-3.5 mr-1" aria-hidden="true" />
                  Voltar para a tela de login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
