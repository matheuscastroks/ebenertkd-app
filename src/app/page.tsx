import { redirect } from "next/navigation";
import { AuthEntry } from "@/components/auth/auth-entry";
import { AuthShell, AuthTextLink } from "@/components/auth/auth-shell";
import { resolveDashboardPath } from "@/lib/auth/auth-utils";
import { getCurrentProfile } from "@/lib/auth/session";

type HomeParams = { error?: string; message?: string; context?: string; registered?: string; deleted?: string };

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
    setup_required: "Cadastro indisponível no momento. Fale com a academia."
  };
  const registrationError = params.context === "cadastro"
    ? registrationErrors[params.error ?? ""] ?? params.message ?? "Não foi possível concluir o cadastro."
    : undefined;

  // Avisos de sucesso vindos de outros fluxos (nova senha, exclusão de conta) aparecem como toast.
  const notice = params.message === "password_updated" && !params.error
    ? { title: "Senha atualizada", description: "Entre com a nova senha.", clearParams: ["message"] }
    : params.deleted === "1"
      ? { title: "Conta excluída", description: "Seu acesso ao portal foi encerrado.", clearParams: ["deleted"] }
      : undefined;

  return (
    <AuthShell
      title="Acesse sua conta"
      footer={
        <p>
          Ao usar o portal, você confirma ter lido a <AuthTextLink href="/privacidade">Política de Privacidade</AuthTextLink>.
        </p>
      }
    >
      <AuthEntry
        minorError={minorError}
        adultError={adultError}
        registrationError={registrationError}
        registered={params.registered === "1"}
        notice={notice}
      />
    </AuthShell>
  );
}
