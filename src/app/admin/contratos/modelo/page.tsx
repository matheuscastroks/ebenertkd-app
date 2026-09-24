import { saveContractTemplateAction } from "@/app/actions/contracts";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTRACT_VARIABLES } from "@/features/contracts/rules";
import { DEFAULT_CONTRACT_CONTENT, getContractTemplate, listContractVersions } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function ContractTemplatePage({ searchParams }: { searchParams: Promise<{ saved?: string; published?: string; error?: string }> }) {
  const admin = await requireProfile("admin");
  const [template, query] = await Promise.all([getContractTemplate(), searchParams]);
  const versions = template ? await listContractVersions(template.$id) : [];
  return <PortalShell profile={admin} activePath={ROUTES.adminContracts} title="Modelo de contrato" subtitle="Rascunhos podem mudar; versões publicadas permanecem imutáveis."><div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]"><Card><CardHeader><CardTitle>Texto do contrato</CardTitle><CardDescription>Use somente as variáveis documentadas. Publicar cria uma nova versão para contratos futuros.</CardDescription></CardHeader><CardContent><form action={saveContractTemplateAction} className="space-y-4">{query.saved ? <p className="text-sm text-emerald-700">Rascunho salvo.</p> : null}{query.published ? <p className="text-sm text-emerald-700">Nova versão publicada.</p> : null}{query.error ? <p className="text-sm text-destructive">Revise o texto e as variáveis utilizadas.</p> : null}<label className="grid gap-2"><span className="text-sm font-medium">Nome</span><Input name="name" defaultValue={template?.name ?? "Contrato padrão"} required /></label><label className="grid gap-2"><span className="text-sm font-medium">Conteúdo</span><Textarea name="content" defaultValue={template?.draft_content ?? DEFAULT_CONTRACT_CONTENT} className="min-h-[520px] font-mono leading-6" required /></label><div className="flex flex-wrap gap-3"><Button name="intent" value="save" type="submit" variant="outline">Salvar rascunho</Button><Button name="intent" value="publish" type="submit">Publicar nova versão</Button></div></form></CardContent></Card><div className="space-y-5"><Card><CardHeader><CardTitle className="text-base">Variáveis permitidas</CardTitle></CardHeader><CardContent className="space-y-2">{CONTRACT_VARIABLES.map((variable) => <code key={variable} className="block rounded bg-muted px-2 py-1 text-xs">{`{{ ${variable} }}`}</code>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Histórico publicado</CardTitle></CardHeader><CardContent className="space-y-2">{versions.length ? versions.map((version) => <div key={version.$id} className="rounded border p-3 text-sm"><strong>Versão {version.version}</strong><p className="text-xs text-muted-foreground">{new Date(version.published_at).toLocaleString("pt-BR")}</p></div>) : <p className="text-sm text-muted-foreground">Nenhuma versão publicada.</p>}</CardContent></Card></div></div></PortalShell>;
}
