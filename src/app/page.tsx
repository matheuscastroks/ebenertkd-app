import { redirect } from "next/navigation";
import { AuthEntry } from "@/components/auth/auth-entry";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { getCurrentProfile } from "@/lib/auth/session";

type HomeParams = { error?: string; message?: string; context?: string; registered?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeParams> }) {
  const profile = await getCurrentProfile();
  if (profile) redirect(resolveDashboardPath(profile.role));

  const params = await searchParams;
  const fallbackLoginError = params.error === "account_unavailable"
    ? "Esta conta está indisponível. Fale com a academia."
    : "Faça login para continuar.";
  const adultError = params.context === "adult" || (!params.context && params.error)
    ? params.message ?? fallbackLoginError
    : undefined;
  const minorError = params.context === "minor" ? params.message : undefined;
  const registrationErrors: Record<string, string> = {
    registration_invalid: "Revise os dados. A senha deve ter pelo menos 8 caracteres.",
    registration_failed: "Não foi possível criar a conta. Confirme se o e-mail já foi usado.",
    setup_required: "A configuração do Appwrite ainda não foi concluída."
  };
  const registrationError = params.context === "cadastro"
    ? params.message ?? registrationErrors[params.error ?? ""] ?? "Não foi possível concluir o cadastro."
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">EBENER TKD</p>
          <h1 className="text-3xl font-semibold tracking-tight">Acesse sua conta</h1>
        </div>
        <AuthEntry minorError={minorError} adultError={adultError} registrationError={registrationError} registered={params.registered === "1"} />
      </div>
    </main>
  );
}
