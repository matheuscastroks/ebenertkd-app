import { Field, FieldLabel } from "@/components/ui/field";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmationForm } from "@/features/billing/components/confirmation-form";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { saveContractTemplateAction } from "@/app/actions/contracts";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ContractContentEditor } from "@/features/contracts/components/contract-content-editor";
import { Badge } from "@/components/ui/badge";
import { CONTRACT_VARIABLES } from "@/features/contracts/rules";
import { DEFAULT_CONTRACT_CONTENT, getContractTemplate, listContractVersions } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { FileCode, History, Save } from "lucide-react";

export default async function ContractTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; published?: string; error?: string }>;
}) {
  const admin = await requireProfile("admin");
  const [template, query] = await Promise.all([getContractTemplate(), searchParams]);
  const versions = template ? await listContractVersions(template.$id) : [];

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminContracts}
      title="Modelo de contrato"
      subtitle="Rascunhos podem ser alterados livremente; versões publicadas permanecem imutáveis para contratos já gerados."
      breadcrumbs={[
        { label: "Contratos", href: ROUTES.adminContracts },
        { label: "Modelo padrão" },
      ]}
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

      <div className="w-full min-w-0 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Editor Principal */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Texto do contrato</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Edite o texto base. Você pode salvar como rascunho ou publicar uma nova versão oficial para contratos futuros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmationForm id="contract-template" action={saveContractTemplateAction} className="space-y-5">
              <Field>
                <FieldLabel htmlFor="template-name">Identificação do modelo</FieldLabel>
                <Input
                  id="template-name" name="name"
                  defaultValue={template?.name ?? "Contrato de Prestação de Serviços - Taekwondo"}
                  required
                  className="h-11"
                  placeholder="Ex: Contrato padrão de matrícula"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="template-content">Conteúdo e cláusulas</FieldLabel>
                  <span className="text-xs text-muted-foreground">Markdown / Texto simples</span>
                </div>
                <ContractContentEditor content={template?.draft_content ?? DEFAULT_CONTRACT_CONTENT} />
              </Field>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  name="intent"
                  value="save"
                  type="submit"
                  variant="outline"
                  className="h-11 font-medium sm:flex-1"
                >
                  <Save className="mr-2 size-4" />
                  Salvar rascunho
                </Button>
                <ConsequenceDialog trigger={<Button type="button" className="min-h-11">Publicar nova versão</Button>} title={`Publicar versão ${Math.max(0, ...versions.map((version) => version.version)) + 1}?`} summary={[{ label: "Modelo", value: template?.name ?? "Contrato padrão", field: "name" }]} effect="Novos contratos usarão esta versão. Contratos atuais não mudam." confirmLabel="Publicar versão" action={saveContractTemplateAction} formId="contract-template" values={{ intent: "publish" }} />
              </div>
            </ConfirmationForm>
          </CardContent>
        </Card>

        {/* Sidebar com Variáveis e Histórico */}
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="size-4 text-primary-text" />
                <CardTitle className="text-base font-semibold">Variáveis disponíveis</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Substituídas automaticamente pelos dados do aluno e da mensalidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_VARIABLES.map((variable) => (
                  <code
                    key={variable}
                    className="inline-block rounded-md border border-border/60 bg-muted/60 px-2 py-1 font-mono text-xs text-foreground select-all"
                  >
                    {`{{ ${variable} }}`}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary-text" />
                <CardTitle className="text-base font-semibold">Histórico de versões</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Versões publicadas e data de disponibilização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions.length ? (
                versions.map((version) => (
                  <div
                    key={version.$id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Versão {version.version}</span>
                        {version.$id === template?.published_version_id && (
                          <StatusBadge tone="success">
                            Vigente
                          </StatusBadge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(version.published_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma versão publicada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
