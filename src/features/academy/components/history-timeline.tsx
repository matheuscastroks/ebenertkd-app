"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { restoreConfigRevisionAction } from "@/app/actions/academy-settings";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { HistoryDiff } from "@/features/academy/components/history-diff";
import type { HistoryEntry } from "@/features/academy/history-rules";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";

const formatWhen = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Linha do tempo das alterações de configuração, com "ver diferença" e "restaurar esta versão". */
export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  const router = useRouter();

  const restore = async (entry: HistoryEntry) => {
    const result = await restoreConfigRevisionAction(entry.id, entry.latestRevision).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (result.ok) {
      toast.success("Versão restaurada", { description: "Uma nova revisão foi criada com os valores desta versão." });
      router.refresh();
      return;
    }
    if (result.error === "revision_conflict") toast.error("Não foi possível restaurar", { description: "Outra alteração foi salva antes. Recarregue a página e tente de novo." });
    else if (result.error === "invalid") toast.error("Não foi possível restaurar", { description: "Os valores desta versão não são mais válidos para esta seção." });
    else toast.error("Não foi possível restaurar", { description: "Tente novamente em instantes." });
  };

  if (entries.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma alteração registrada ainda. Cada vez que você salvar uma configuração, ela aparece aqui.</p>;
  }

  return (
    <ol className="space-y-3" aria-label="Alterações de configuração">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-xl bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {entry.sectionLabel}
                <span className="text-sm font-normal text-muted-foreground">versão {entry.revision}</span>
                {entry.isCurrent ? <StatusBadge tone="success">Em vigor</StatusBadge> : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatWhen(entry.changedAt)} · {entry.diff.length} campo{entry.diff.length === 1 ? "" : "s"} alterado{entry.diff.length === 1 ? "" : "s"}
              </p>
              {entry.reason ? <p className="text-sm">{entry.reason}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ResponsiveDialog
                size="lg"
                trigger={<Button type="button" variant="outline" className="min-h-11">Ver diferença</Button>}
                title={`${entry.sectionLabel}: versão ${entry.revision}`}
                description="O que mudou em relação à versão anterior."
              >
                <HistoryDiff rows={entry.diff} />
              </ResponsiveDialog>
              <ConsequenceDialog
                trigger={<Button type="button" variant="outline" className="min-h-11" disabled={entry.isCurrent}>Restaurar esta versão</Button>}
                title="Restaurar esta versão?"
                effect="Os valores gravados nesta versão voltam a valer. O histórico não é apagado: a restauração entra como uma nova revisão. Contratos, cobranças e registros já emitidos não mudam."
                summary={[
                  { label: "Seção", value: entry.sectionLabel },
                  { label: "Versão", value: String(entry.revision) },
                  { label: "Campos que voltam", value: String(entry.diff.length) }
                ]}
                confirmLabel="Restaurar"
                action={() => restore(entry)}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
