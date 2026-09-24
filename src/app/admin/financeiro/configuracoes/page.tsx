import { saveBillingSettingsAction } from "@/app/actions/billing";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBillingSettings } from "@/features/billing/settings-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const [actor, settings, params] = await Promise.all([requireProfile("admin"), getBillingSettings(), searchParams]);
  return <PortalShell profile={actor} activePath={ROUTES.adminBilling} title="Configuração financeira" subtitle="Defina os dados PIX exibidos para alunos e responsáveis."><Card className="max-w-2xl"><CardHeader><CardTitle>Dados de recebimento</CardTitle></CardHeader><CardContent>{params.updated ? <p className="mb-4 text-sm text-emerald-700">Configuração salva.</p> : null}{params.error ? <p className="mb-4 text-sm text-destructive">Revise os dados informados.</p> : null}<form action={saveBillingSettingsAction} className="grid gap-4"><label className="grid gap-2 text-sm">Beneficiário<Input name="beneficiary_name" defaultValue={settings?.beneficiary_name} required /></label><label className="grid gap-2 text-sm">Tipo da chave<select name="pix_key_type" defaultValue={settings?.pix_key_type ?? "random"} className="h-9 rounded-md border bg-background px-3"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></label><label className="grid gap-2 text-sm">Chave PIX<Input name="pix_key" defaultValue={settings?.pix_key} required /></label><label className="grid gap-2 text-sm">Instruções<textarea name="instructions" defaultValue={settings?.instructions ?? ""} className="min-h-28 rounded-md border bg-background p-3" /></label><Button type="submit">Salvar configuração</Button></form></CardContent></Card></PortalShell>;
}
