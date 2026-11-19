"use client";

import { useState } from "react";
import { saveDefaultMonthlyFeeAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";
import { formatBrl } from "@/lib/money";

export type DefaultFeeState = { cents: number; revision: number };

/**
 * Mostra a mensalidade padrão (da política financeira) ao lado da média real e permite adotar o valor digitado na calculadora
 * como padrão. A mudança passa por confirmação e vale só para novas matrículas (gera uma revisão da seção financeira).
 */
export function DefaultFeeShortcut({ initial, candidateCents, onSaved }: { initial: DefaultFeeState; candidateCents: number; onSaved?: (state: DefaultFeeState) => void }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const different = candidateCents >= 100 && candidateCents !== state.cents;

  const save = async () => {
    const result = await saveDefaultMonthlyFeeAction(candidateCents, state.revision).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (result.ok) {
      const next = { cents: candidateCents, revision: result.revision };
      setState(next);
      onSaved?.(next);
      setMessage({ tone: "success", text: "Mensalidade padrão atualizada." });
    } else {
      setMessage({ tone: "error", text: result.error === "revision_conflict" ? "Outra alteração foi salva antes. Recarregue a página." : "Não foi possível salvar agora." });
    }
  };

  return (
    <div className="space-y-1.5 text-sm" data-testid="default-fee">
      <p className="text-muted-foreground">
        Mensalidade padrão para novas matrículas: <span className="font-medium tabular-nums text-foreground">{formatBrl(state.cents)}</span>
      </p>
      {different ? (
        <ConsequenceDialog
          trigger={<Button type="button" variant="outline" size="sm" className="min-h-11">Usar como mensalidade padrão</Button>}
          title="Usar este valor como mensalidade padrão?"
          effect="Vale só para novas matrículas: o valor vem preenchido na aprovação. Os alunos atuais não mudam; para eles use o reajuste de mensalidade."
          summary={[
            { label: "Mensalidade padrão atual", value: formatBrl(state.cents) },
            { label: "Nova mensalidade padrão", value: formatBrl(candidateCents) }
          ]}
          confirmLabel="Usar como padrão"
          action={save}
        />
      ) : null}
      {message ? <p role="status" className={message.tone === "error" ? "text-destructive" : "text-muted-foreground"}>{message.text}</p> : null}
    </div>
  );
}
