"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  applyTuitionAdjustmentAction,
  cancelTuitionAdjustmentAction,
  markAdjustmentNotifiedAction,
  publishAdjustmentNoticeAction
} from "@/app/actions/tuition-adjustment";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { buildMessageVariables, buildWhatsappMessageLink, interpolateMessage } from "@/features/billing/adjustment-message";
import type { SendList } from "@/features/billing/adjustment-service";
import { netFeeCents } from "@/features/billing/adjustment-rules";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { MessageCircle } from "@/components/ui/icons";

const STATUS_LABELS = { draft: "Rascunho", applied: "Reajuste confirmado", cancelled: "Cancelada" } as const;
const STATUS_TONES = { draft: "warning", applied: "success", cancelled: "neutral" } as const;

export function AdjustmentSendList({ data, professorName, academyName }: { data: SendList; professorName: string; academyName?: string }) {
  const router = useRouter();
  const { adjustment, rows } = data;
  const [notified, setNotified] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((row) => [row.enrollmentId, Boolean(row.notifiedAt)])));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [noticePublished, setNoticePublished] = useState(Boolean(adjustment.noticePublishedAt));

  const doneCount = rows.filter((row) => notified[row.enrollmentId]).length;
  const included = rows.length;

  function messageFor(row: SendList["rows"][number]) {
    return interpolateMessage(
      adjustment.messageTemplate,
      buildMessageVariables({
        payerName: row.payerName,
        studentName: row.studentName,
        previousFeeCents: row.previousFeeCents,
        newFeeCents: row.newFeeCents,
        discountCents: row.discountCents,
        effectiveFrom: adjustment.effectiveFrom,
        indexLabel: adjustment.referenceIndexLabel,
        professor: professorName,
        academy: academyName
      })
    );
  }

  async function copy(row: SendList["rows"][number]) {
    try {
      await navigator.clipboard.writeText(messageFor(row));
      setCopiedId(row.enrollmentId);
      window.setTimeout(() => setCopiedId((current) => (current === row.enrollmentId ? null : current)), 2000);
    } catch {
      setMessage({ tone: "error", text: "Não foi possível copiar. Selecione o texto e copie manualmente." });
    }
  }

  async function setDone(row: SendList["rows"][number], value: boolean) {
    setNotified((current) => ({ ...current, [row.enrollmentId]: value }));
    const result = await markAdjustmentNotifiedAction(adjustment.id, row.enrollmentId, value);
    if (!result.ok) {
      setNotified((current) => ({ ...current, [row.enrollmentId]: !value }));
      setMessage({ tone: "error", text: result.error });
    }
  }

  async function apply() {
    const result = await applyTuitionAdjustmentAction(adjustment.id);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setMessage({
      tone: "success",
      text: result.alreadyApplied
        ? "Este reajuste já havia sido confirmado."
        : `Reajuste confirmado para ${result.applied} aluno${result.applied === 1 ? "" : "s"}.${result.skipped ? ` ${result.skipped} foram mantidos porque a mensalidade mudou desde a simulação.` : ""}`
    });
    router.refresh();
  }

  async function cancel() {
    const result = await cancelTuitionAdjustmentAction(adjustment.id);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    router.refresh();
  }

  async function publishNotice() {
    const result = await publishAdjustmentNoticeAction(adjustment.id);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setNoticePublished(true);
    setMessage({ tone: "success", text: "Aviso geral publicado em Avisos, com notificação no aplicativo." });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONES[adjustment.status]}>{STATUS_LABELS[adjustment.status]}</StatusBadge>
              <span className="text-sm text-muted-foreground">Vigência: {formatBusinessDateBr(adjustment.effectiveFrom)}</span>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              Impacto mensal em regime:{" "}
              <span className="font-medium text-foreground">{formatBrl(adjustment.totalMonthlyImpactCents)}</span> · {adjustment.itemCount} aluno{adjustment.itemCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {adjustment.status === "draft" ? (
              <>
                <ConsequenceDialog
                  trigger={<Button type="button" className="min-h-11">Confirmar reajuste</Button>}
                  title="Confirmar reajuste de mensalidades?"
                  effect="Os novos valores são gravados nas matrículas e passam a valer na próxima renovação de cada contrato. Contratos já assinados e cobranças já geradas não mudam."
                  confirmLabel="Confirmar reajuste"
                  summary={[
                    { label: "Alunos reajustados", value: String(adjustment.itemCount) },
                    { label: "Vigência", value: formatBusinessDateBr(adjustment.effectiveFrom) },
                    { label: "Ganho mensal em regime", value: formatBrl(adjustment.totalMonthlyImpactCents) }
                  ]}
                  action={apply}
                />
                <ConsequenceDialog
                  trigger={<Button type="button" variant="outline" className="min-h-11">Cancelar campanha</Button>}
                  title="Cancelar esta campanha?"
                  effect="A campanha em rascunho será descartada. Nenhuma mensalidade foi alterada."
                  confirmLabel="Cancelar campanha"
                  destructive
                  summary={[{ label: "Alunos na campanha", value: String(adjustment.itemCount) }]}
                  action={cancel}
                />
              </>
            ) : null}
            {adjustment.status !== "cancelled" ? (
              <ConsequenceDialog
                trigger={
                  <Button type="button" variant="outline" className="min-h-11" disabled={noticePublished}>
                    {noticePublished ? "Aviso geral publicado" : "Publicar aviso geral no app"}
                  </Button>
                }
                title="Publicar aviso geral?"
                effect="Todos os usuários ativos recebem em Avisos (e por notificação) um texto geral sobre o reajuste, sem valores individuais. Só pode ser publicado uma vez por campanha."
                confirmLabel="Publicar aviso"
                summary={[{ label: "Vigência citada", value: formatBusinessDateBr(adjustment.effectiveFrom) }]}
                action={publishNotice}
              />
            ) : null}
          </div>
        </div>

        {adjustment.status === "draft" ? (
          <p className="text-xs text-muted-foreground">
            Você pode avisar as famílias agora e confirmar o reajuste depois. Confirmar grava os valores nas matrículas.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium" data-testid="progress-label">{doneCount} de {included} avisados</p>
          </div>
          <Progress value={included > 0 ? (doneCount / included) * 100 : 0} aria-label="Progresso dos avisos" />
        </div>

        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {message.text}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aluno incluído nesta campanha.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {rows.map((row) => {
            const text = messageFor(row);
            const link = buildWhatsappMessageLink(row.whatsappBase, text);
            const done = Boolean(notified[row.enrollmentId]);
            return (
              <li key={row.enrollmentId} className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{row.payerName}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {row.studentName !== row.payerName ? `Aluno: ${row.studentName} · ` : ""}
                    {formatBrl(netFeeCents(row.previousFeeCents, row.discountCents))} → {formatBrl(netFeeCents(row.newFeeCents, row.discountCents))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => copy(row)} aria-label={`Copiar mensagem para ${row.payerName}`}>
                    {copiedId === row.enrollmentId ? "Copiada" : "Copiar mensagem"}
                  </Button>
                  {link ? (
                    <Button asChild size="sm" variant="outline" className="min-h-10">
                      <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir no WhatsApp: ${row.payerName}`}>
                        <MessageCircle className="size-3.5" aria-hidden="true" />
                        Abrir no WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem telefone válido</span>
                  )}
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox checked={done} onCheckedChange={(checked) => setDone(row, checked === true)} aria-label={`Avisado: ${row.payerName}`} />
                    Avisado
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
