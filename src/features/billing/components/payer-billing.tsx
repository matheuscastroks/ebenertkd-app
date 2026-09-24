import { uploadPaymentProofAction } from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { listProofsForCharge } from "@/features/billing/proof-service";
import { getBillingSettings } from "@/features/billing/settings-service";
import { CopyPixButton } from "@/features/billing/components/copy-pix-button";

const labels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Em atraso", cancelled: "Cancelado" } as const;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export async function PayerBilling({ actor, profileId }: { actor: Profile; profileId?: string }) {
  const [charges, settings] = await Promise.all([listChargesForStudent(actor, profileId), getBillingSettings()]);
  const proofs = new Map(await Promise.all(charges.map(async (charge) => [charge.$id, (await listProofsForCharge(charge.$id))[0]] as const)));
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle className="text-base">Pagamento por PIX</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      {settings ? <><p>Beneficiário: <strong>{settings.beneficiary_name}</strong></p><div className="flex flex-wrap items-center gap-2"><span>Chave ({settings.pix_key_type}):</span><code className="rounded bg-muted px-2 py-1">{settings.pix_key}</code><CopyPixButton value={settings.pix_key} /></div>{settings.instructions ? <p className="text-muted-foreground">{settings.instructions}</p> : null}</> : <p className="text-muted-foreground">A academia ainda não configurou a chave PIX.</p>}
    </CardContent></Card>
    {charges.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma cobrança emitida.</CardContent></Card> : charges.map((charge) => {
      const proof = proofs.get(charge.$id);
      const canUpload = ["pending", "overdue", "proof_under_review"].includes(charge.status);
      return <Card key={charge.$id}><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="text-base">{charge.description}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Vence em {new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><Badge variant={charge.status === "overdue" ? "destructive" : "outline"}>{labels[charge.status]}</Badge></CardHeader><CardContent className="space-y-4">
        <p className="text-2xl font-semibold">{money(charge.amount_cents)}</p>
        {proof ? <p className="text-sm text-muted-foreground">Comprovante v{proof.version}: {proof.status === "rejected" ? `recusado — ${proof.rejection_reason}` : proof.status === "pending" ? "aguardando análise" : labels[charge.status]}</p> : null}
        {canUpload ? <form action={uploadPaymentProofAction} className="flex flex-col gap-2 sm:flex-row"><input type="hidden" name="charge_id" value={charge.$id} />{profileId ? <input type="hidden" name="profile_id" value={profileId} /> : null}<Input type="file" name="proof" accept="image/jpeg,image/png,image/webp,application/pdf" required /><Button type="submit">Enviar comprovante</Button></form> : null}
      </CardContent></Card>;
    })}
  </div>;
}
