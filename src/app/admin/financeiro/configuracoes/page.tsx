import { saveBillingSettingsAction } from "@/app/actions/billing";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getBillingSettings } from "@/features/billing/settings-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const [actor, settings, params] = await Promise.all([requireProfile("admin"), getBillingSettings(), searchParams]);
  return <PortalShell profile={actor} activePath={ROUTES.adminBilling} title="Configuração financeira" subtitle="Defina os dados PIX exibidos para alunos e responsáveis."><Card className="max-w-2xl"><CardHeader><CardTitle>Dados de recebimento</CardTitle></CardHeader><CardContent className="space-y-4">{params.updated ? <OperationToast tone="success" title="Configuração salva" clearParams={["updated"]} /> : null}{params.error ? <OperationToast tone="error" title="Revise os dados informados" clearParams={["error"]} /> : null}<form action={saveBillingSettingsAction} className="grid gap-4"><Field><FieldLabel htmlFor="beneficiary-name">Beneficiário</FieldLabel><Input id="beneficiary-name" name="beneficiary_name" defaultValue={settings?.beneficiary_name} required /></Field><Field><FieldLabel htmlFor="pix-key-type">Tipo da chave</FieldLabel><Select name="pix_key_type" defaultValue={settings?.pix_key_type ?? "random"}><SelectTrigger id="pix-key-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Aleatória</SelectItem></SelectContent></Select></Field><Field><FieldLabel htmlFor="pix-key">Chave PIX</FieldLabel><Input id="pix-key" name="pix_key" defaultValue={settings?.pix_key} required /></Field><Field><FieldLabel htmlFor="pix-instructions">Instruções</FieldLabel><Textarea id="pix-instructions" name="instructions" defaultValue={settings?.instructions ?? ""} className="min-h-28" /><FieldDescription>Este texto será exibido para alunos e responsáveis antes do envio do comprovante.</FieldDescription></Field><FormSubmitButton pendingLabel="Salvando…">Salvar configuração</FormSubmitButton></form></CardContent></Card></PortalShell>;
}
