"use client";

import { useMemo, useState } from "react";
import { WalletCards } from "@/components/ui/icons";
import { ChevronLeftIcon } from "@/components/ui/chevron-left";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { FileTextIcon } from "@/components/ui/file-text";
import { SearchIcon } from "@/components/ui/search";
import { UploadIcon } from "@/components/ui/upload";
import { WalletIcon } from "@/components/ui/wallet";
import { uploadPaymentProofAction } from "@/app/actions/billing";
import { EmptyState } from "@/components/shared/empty-state";
import { FileField } from "@/components/shared/file-field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyPixButton } from "@/features/billing/components/copy-pix-button";
import { formatCompetence } from "@/features/billing/format-competence";
import { chargeTitle, chargeTypeLabels } from "@/features/billing/components/charge-title";
import { filterPayerCharges, type PayerChargeView } from "@/features/billing/payer-billing-filters";
import type { BillingSettings, Charge, PaymentProof } from "@/features/billing/types";

const PAGE_SIZE = 10;
const views: { value: PayerChargeView; label: string }[] = [
  { value: "all", label: "Todos" }, { value: "open", label: "Em aberto" },
  { value: "review", label: "Em análise" }, { value: "paid", label: "Pagos" },
  { value: "cancelled", label: "Cancelados" }
];
const labels = { pending: "Pendente", proof_under_review: "Em análise", paid: "Pago", overdue: "Em atraso", cancelled: "Cancelado" } as const;
const tones: Record<keyof typeof labels, StatusTone> = { pending: "warning", proof_under_review: "info", paid: "success", overdue: "danger", cancelled: "neutral" };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const ALL_MONTHS = "all";

const isPayable = (charge: Charge) => charge.status === "pending" || charge.status === "overdue";

/** A cobrança mais urgente (atrasada primeiro, depois a de vencimento mais próximo) recebe a única ação primária. */
export function mostUrgentChargeId(charges: Charge[]) {
  return [...charges].filter(isPayable).sort((a, b) => (a.status === b.status ? a.due_date.localeCompare(b.due_date) : a.status === "overdue" ? -1 : 1))[0]?.$id;
}

function ChargeDetails({ charge, proof, settings, profileId }: { charge: Charge; proof?: PaymentProof; settings: BillingSettings | null; profileId?: string }) {
  const canUpload = charge.status === "pending" || charge.status === "overdue" || charge.status === "proof_under_review";
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-surface-recessed/60 p-4 "><div><p className="text-sm text-muted-foreground">Valor</p><p className="text-2xl font-semibold tabular-nums">{money(charge.amount_cents)}</p><p className="text-sm text-muted-foreground">Vencimento: {date(charge.due_date)}</p></div><StatusBadge tone={tones[charge.status]}>{labels[charge.status]}</StatusBadge></div>
    {proof ? <div className="flex items-start gap-2 text-sm"><FileTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Comprovante enviado · {proof.status === "rejected" ? `Recusado: ${proof.rejection_reason ?? "envie um novo arquivo"}` : proof.status === "pending" ? "aguardando análise" : "aprovado"}</p></div> : null}
    {canUpload ? <><div className="space-y-2 border-t pt-4"><h3 className="font-medium">Pagar por PIX</h3>{settings ? <><p className="text-sm">Beneficiário: <strong>{settings.beneficiary_name}</strong></p><div className="flex flex-wrap items-center gap-2"><code className="max-w-full break-all rounded bg-muted px-2 py-1 text-sm">{settings.pix_key}</code><CopyPixButton value={settings.pix_key} /></div>{settings.instructions ? <p className="text-sm text-muted-foreground">{settings.instructions}</p> : null}</> : <p className="text-sm text-muted-foreground">A academia ainda não informou a chave PIX.</p>}</div><form action={uploadPaymentProofAction} className="space-y-3 border-t pt-4"><input type="hidden" name="charge_id" value={charge.$id} />{profileId ? <input type="hidden" name="profile_id" value={profileId} /> : null}<FileField name="proof" label={proof?.status === "rejected" ? "Enviar outro comprovante" : "Comprovante"} accept="image/jpeg,image/png,image/webp,application/pdf" description="Imagem ou PDF de até 5 MB." required /><FormSubmitButton pendingLabel="Enviando…"><UploadIcon aria-hidden="true" />Enviar comprovante</FormSubmitButton></form></> : null}
  </div>;
}

export function PayerBillingView({ charges, proofs, settings, profileId, initialView = "open" }: { charges: Charge[]; proofs: Record<string, PaymentProof>; settings: BillingSettings | null; profileId?: string; initialView?: PayerChargeView }) {
  const [view, setView] = useState<PayerChargeView>(initialView);
  const [search, setSearch] = useState("");
  const [competence, setCompetence] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => filterPayerCharges(charges, view, search, competence), [charges, view, search, competence]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const changeView = (next: PayerChargeView) => { setView(next); setPage(1); };
  const urgentId = useMemo(() => mostUrgentChargeId(charges), [charges]);
  const months = useMemo(() => [...new Set(charges.map((charge) => charge.competence).filter((value) => formatCompetence(value) !== "—"))].sort().reverse(), [charges]);

  const details = (charge: Charge) => {
    const payable = isPayable(charge);
    const isReview = charge.status === "proof_under_review";
    const triggerLabel = payable ? "Pagar" : isReview ? "Ver envio" : "Detalhes";
    const triggerVariant = payable && charge.$id === urgentId ? "default" : "outline";

    return (
      <ResponsiveDialog
        trigger={
          <Button size="sm" variant={triggerVariant} className="min-h-11 font-medium touch-manipulation" aria-label={`${triggerLabel}: ${chargeTitle(charge)}`}>
            {payable ? <WalletIcon aria-hidden="true" /> : null}
            {triggerLabel}
          </Button>
        }
        title={chargeTitle(charge)}
        description={`${chargeTypeLabels[charge.charge_type] ?? "Cobrança"} referente a ${formatCompetence(charge.competence)}.`}
      >
        <ChargeDetails
          charge={charge}
          proof={proofs[charge.$id]}
          settings={settings}
          profileId={profileId}
        />
      </ResponsiveDialog>
    );
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2" aria-label="Filtrar pagamentos por situação">{views.map((option) => <Button key={option.value} type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-9 aria-pressed:border-foreground aria-pressed:bg-muted aria-pressed:text-foreground" onClick={() => changeView(option.value)} aria-pressed={view === option.value}>{option.label}</Button>)}</div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]"><InputGroup className="h-10"><InputGroupAddon><SearchIcon className="size-4" aria-hidden="true" /></InputGroupAddon><InputGroupInput aria-label="Buscar cobrança" placeholder="Buscar cobrança" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></InputGroup><Select value={competence || ALL_MONTHS} onValueChange={(value) => { setCompetence(value === ALL_MONTHS ? "" : value); setPage(1); }}><SelectTrigger aria-label="Filtrar por mês" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_MONTHS}>Todos os meses</SelectItem>{months.map((value) => <SelectItem key={value} value={value}>{formatCompetence(value)}</SelectItem>)}</SelectContent></Select></div>
    {filtered.length === 0 ? <EmptyState icon={<WalletCards className="size-5" aria-hidden="true" />} title="Nenhum pagamento encontrado" description="Experimente outro filtro ou período." /> : <>
      <div className="hidden overflow-hidden rounded-xl border border-border/50 bg-card shadow-xs md:block"><Table><TableHeader><TableRow><TableHead>Cobrança</TableHead><TableHead>Competência</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{visible.map((charge) => <TableRow key={charge.$id}><TableCell className="font-medium">{chargeTitle(charge)}</TableCell><TableCell>{formatCompetence(charge.competence)}</TableCell><TableCell>{date(charge.due_date)}</TableCell><TableCell className="font-semibold tabular-nums">{money(charge.amount_cents)}</TableCell><TableCell><StatusBadge tone={tones[charge.status]}>{labels[charge.status]}</StatusBadge></TableCell><TableCell className="text-right">{details(charge)}</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50 bg-card shadow-xs md:hidden">{visible.map((charge) => <div key={charge.$id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{chargeTitle(charge)}</p><p className="text-sm text-muted-foreground">Vence {date(charge.due_date)}</p></div><StatusBadge tone={tones[charge.status]}>{labels[charge.status]}</StatusBadge></div><div className="flex items-center justify-between"><p className="font-semibold tabular-nums">{money(charge.amount_cents)}</p>{details(charge)}</div></div>)}</div>
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Páginas de cobranças"><p className="text-sm text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon-sm" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeftIcon aria-hidden="true" /></Button><span className="text-sm tabular-nums">{currentPage} / {totalPages}</span><Button type="button" variant="outline" size="icon-sm" aria-label="Próxima página" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRightIcon aria-hidden="true" /></Button></div></nav>
    </>}
  </div>;
}
