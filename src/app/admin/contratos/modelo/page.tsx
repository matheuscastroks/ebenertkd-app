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
import { FRIENDLY_CONTRACT_VARIABLES } from "@/features/contracts/rules";
import { DEFAULT_CONTRACT_CONTENT, getContractTemplate, listContractVersions } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { Save } from "lucide-react";

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
      subtitle="Rascunhos podem mudar à vontade. Versões publicadas não alteram contratos já gerados."
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

      <div className="w-full min-w-0 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Editor Principal */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">Texto do contrato</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Salve como rascunho enquanto edita. Publique quando o texto estiver pronto para novos contratos.
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
                </div>
                <ContractContentEditor content={template?.draft_content ?? DEFAULT_CONTRACT_CONTENT} />
              </Field>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  name="intent"
                  value="save"
                  type="submit"
                  variant="outline"
                  className="min-h-11 font-medium sm:flex-1"
                >
                  <Save className="size-4" aria-hidden="true" />
                  Salvar rascunho
                </Button>
                <ConsequenceDialog trigger={<Button type="button" className="min-h-11">Publicar nova versão</Button>} title={`Publicar versão ${Math.max(0, ...versions.map((version) => version.version)) + 1}?`} summary={[{ label: "Modelo", value: template?.name ?? "Contrato padrão", field: "name" }]} effect="Novos contratos usarão esta versão. Contratos atuais não mudam." confirmLabel="Publicar versão" action={saveContractTemplateAction} formId="contract-template" values={{ intent: "publish" }} />
              </div>
            </ConfirmationForm>
          </CardContent>
        </Card>

        {/* Sidebar agrupada com Variáveis e Histórico */}
        <aside
          aria-label="Variáveis e histórico de versões"
          className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs"
        >
          <section className="p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Variáveis em Português</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Copie e cole no texto. O sistema preenche com os dados reais ao emitir o contrato.
              </p>
            </div>
            <div className="space-y-2.5">
              {FRIENDLY_CONTRACT_VARIABLES.map((item) => (
                <div
                  key={item.ptKey}
                  className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    <code className="select-all rounded bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary-text border border-border">
                      {`{{ ${item.ptKey} }}`}
                    </code>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Histórico de versões</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Versões publicadas e data de disponibilização.
              </p>
            </div>
            <div className="divide-y divide-border">
              {versions.length ? (
                versions.map((version) => (
                  <div
                    key={version.$id}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Versão {version.version}</span>
                        {version.$id === template?.published_version_id && (
                          <StatusBadge tone="success">
                            Vigente
                          </StatusBadge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
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
                <p className="py-1 text-sm text-muted-foreground">Nenhuma versão publicada. Novos contratos só podem ser gerados depois da primeira publicação.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
