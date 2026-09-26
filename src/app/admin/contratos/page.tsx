import Link from "next/link";
import { FileSignature, FileText, FileX2 } from "lucide-react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContractTemplate } from "@/features/contracts/template-service";
import { listCancellationRequests } from "@/features/contracts/cancellation-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminContractsPage() {
  const admin = await requireProfile("admin");
  const [template, cancellations] = await Promise.all([
    getContractTemplate(),
    listCancellationRequests(),
  ]);

  const pendingCancellations = cancellations.filter((c) => c.status === "pending").length;

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminContracts}
      title="Contratos"
      subtitle="Controle o texto vigente, assinaturas e solicitações de encerramento."
      breadcrumbs={[{ label: "Contratos" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="flex flex-col justify-between border-border/80 shadow-sm transition-all hover:border-border">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileSignature className="size-5" />
                </div>
                {template?.published_version_id ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Versão publicada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    Sem versão publicada
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">Modelo padrão</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {template?.published_version_id
                  ? "Existe uma versão oficial publicada e vinculada para novos contratos de matrícula."
                  : "Publique um modelo antes de emitir matrículas para assinatura digital dos alunos."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild className="h-11 w-full sm:w-auto font-medium">
                <Link href={ROUTES.adminContractTemplate}>
                  <FileText className="mr-2 size-4" />
                  Gerenciar modelo
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-border/80 shadow-sm transition-all hover:border-border">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <FileX2 className="size-5" />
                </div>
                {pendingCancellations > 0 ? (
                  <Badge variant="destructive" className="font-semibold">
                    {pendingCancellations} pendente{pendingCancellations > 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Em dia
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">Cancelamentos e Saídas</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Revise solicitações de rescisão, data de aviso prévio e decida eventual taxa ou isenção de mensalidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild variant="outline" className="h-11 w-full sm:w-auto font-medium">
                <Link href={ROUTES.adminCancellations}>
                  <FileX2 className="mr-2 size-4" />
                  Abrir solicitações
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
