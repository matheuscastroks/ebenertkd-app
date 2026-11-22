import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireProfile } from "@/lib/auth/session";
import { ContractTemplateBody } from "./contract-template-body";

export default async function ContractTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; published?: string; error?: string }>;
}) {
  const [admin, query] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      title="Contratos"
      subtitle="Rascunhos podem mudar à vontade. Versões publicadas não alteram contratos já gerados."
    >
      {query.saved ? (
        <OperationToast tone="success" title="Rascunho salvo com sucesso" clearParams={["saved"]} />
      ) : null}
      {query.published ? (
        <OperationToast tone="success" title="Nova versão oficial publicada" clearParams={["published"]} />
      ) : null}
      {query.error ? (
        <OperationToast tone="error" title="Revise o texto e as variáveis obrigatórias utilizadas" clearParams={["error"]} />
      ) : null}

      <Suspense
        fallback={
          <div className="w-full min-w-0 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">Texto do contrato</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Salve como rascunho enquanto edita. Publique quando o texto estiver pronto para novos contratos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <aside aria-label="Histórico de versões" className="overflow-hidden rounded-xl bg-card p-5 shadow-xs space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Histórico de versões</h2>
                <p className="mt-1 text-xs text-muted-foreground">Versões publicadas e data de disponibilização.</p>
              </div>
              <InlineRowsSkeleton rows={2} label="Carregando histórico de versões…" />
            </aside>
          </div>
        }
      >
        <ContractTemplateBody />
      </Suspense>
    </PortalShell>
  );
}
