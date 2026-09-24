import { uploadPaymentProofAction } from "@/app/actions/billing";
import { EmptyState } from "@/components/shared/empty-state";
import { FileField } from "@/components/shared/file-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import type { Profile } from "@/features/auth/types";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { listProofsForCharge } from "@/features/billing/proof-service";
import { getBillingSettings } from "@/features/billing/settings-service";
import { CopyPixButton } from "@/features/billing/components/copy-pix-button";

const labels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Em atraso", cancelled: "Cancelado" } as const;
const tones: Record<keyof typeof labels, StatusTone> = { pending: "warning", proof_under_review: "info", paid: "success", overdue: "danger", cancelled: "neutral" };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export async function PayerBilling({ actor, profileId, view = "open" }: { actor: Profile; profileId?: string; view?: "open" | "history" }) {
  const [charges, settings] = await Promise.all([listChargesForStudent(actor, profileId), getBillingSettings()]);
  const proofs = new Map(await Promise.all(charges.map(async (charge) => [charge.$id, (await listProofsForCharge(charge.$id))[0]] as const)));
  const open = charges.filter((charge) => ["pending", "overdue", "proof_under_review"].includes(charge.status));
  const history = charges.filter((charge) => ["paid", "cancelled"].includes(charge.status));
  const renderCharges = (items: typeof charges, kind: "open" | "history") => items.length === 0 ? <EmptyState title="Nenhuma cobrança nesta visão" description={kind === "open" ? "Quando houver uma mensalidade em aberto, ela aparecerá aqui." : "Pagamentos concluídos aparecerão no histórico."} /> : items.map((charge) => {
    const proof = proofs.get(charge.$id);
    const canUpload = ["pending", "overdue", "proof_under_review"].includes(charge.status);
    return <Card key={charge.$id}><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="text-base">{charge.description}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Vence em {new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><StatusBadge tone={tones[charge.status]}>{labels[charge.status]}</StatusBadge></CardHeader><CardContent className="space-y-4"><p className="text-2xl font-semibold tabular-nums">{money(charge.amount_cents)}</p>{proof ? <Attachment className="w-full"><AttachmentMedia><FileText aria-hidden="true" /></AttachmentMedia><AttachmentContent><AttachmentTitle>Comprovante v{proof.version}</AttachmentTitle><AttachmentDescription>{proof.status === "rejected" ? `Recusado — ${proof.rejection_reason}` : proof.status === "pending" ? "Aguardando análise" : "Aprovado"}</AttachmentDescription></AttachmentContent></Attachment> : null}{canUpload ? <form action={uploadPaymentProofAction} className="space-y-3"><input type="hidden" name="charge_id" value={charge.$id} />{profileId ? <input type="hidden" name="profile_id" value={profileId} /> : null}<FileField name="proof" label={proof?.status === "rejected" ? "Enviar novo comprovante" : "Comprovante"} accept="image/jpeg,image/png,image/webp,application/pdf" description="Imagem ou PDF de até 5 MB." required /><FormSubmitButton pendingLabel="Enviando…">Enviar comprovante</FormSubmitButton></form> : null}</CardContent></Card>;
  });
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle className="text-base">Pagamento por PIX</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      {settings ? <><p>Beneficiário: <strong>{settings.beneficiary_name}</strong></p><div className="flex flex-wrap items-center gap-2"><span>Chave ({settings.pix_key_type}):</span><code className="rounded bg-muted px-2 py-1">{settings.pix_key}</code><CopyPixButton value={settings.pix_key} /></div>{settings.instructions ? <p className="text-muted-foreground">{settings.instructions}</p> : null}</> : <p className="text-muted-foreground">A academia ainda não configurou a chave PIX.</p>}
    </CardContent></Card>
    <Tabs defaultValue={view}><TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="open" asChild><a href="?view=open">Em aberto ({open.length})</a></TabsTrigger><TabsTrigger value="history" asChild><a href="?view=history">Histórico ({history.length})</a></TabsTrigger></TabsList><TabsContent value="open" className="space-y-4 pt-3">{renderCharges(open, "open")}</TabsContent><TabsContent value="history" className="space-y-4 pt-3">{renderCharges(history, "history")}</TabsContent></Tabs>
  </div>;
}
