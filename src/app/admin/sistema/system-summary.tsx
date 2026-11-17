import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { HealthLevel } from "@/features/operations/health-rules";

type HealthSnapshot = {
  cronHealth: { level: HealthLevel };
  backupHealth: { level: HealthLevel };
  storage: { level: HealthLevel };
  failures: unknown[];
};

const needsAttention = (level: HealthLevel) => level === "warning" || level === "critical";

/** Lista, em linguagem do professor, o que precisa de atenção. Vazia quando tudo está em ordem. */
export function systemAttentionItems(health: HealthSnapshot) {
  const items: string[] = [];
  if (needsAttention(health.cronHealth.level)) items.push("Rotina diária de cobranças e lembretes");
  if (needsAttention(health.backupHealth.level)) items.push("Backup externo");
  if (needsAttention(health.storage.level)) items.push("Espaço de armazenamento");
  const failures = health.failures.length;
  if (failures) items.push(`${failures} falha${failures === 1 ? "" : "s"} recente${failures === 1 ? "" : "s"}`);
  return items;
}

/** Resposta direta à pergunta da tela: está tudo funcionando? */
export function SystemSummary({ health }: { health: HealthSnapshot }) {
  const attention = systemAttentionItems(health);
  if (!attention.length) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold">Tudo funcionando</p>
          <p className="text-sm text-muted-foreground">Rotinas, backup e armazenamento sem alertas.</p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold">{attention.length === 1 ? "1 item precisa de atenção" : `${attention.length} itens precisam de atenção`}</p>
        <p className="text-sm text-muted-foreground">{attention.join(" · ")}</p>
      </div>
    </div>
  );
}
