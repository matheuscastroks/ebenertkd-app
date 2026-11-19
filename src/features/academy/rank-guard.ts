import "server-only";

import { getBeltRanks } from "@/features/academy/config-service";
import { findRank } from "@/features/academy/belt-rules";

/**
 * Só aceita graduações habilitadas na configuração. `keepKey` é a graduação que o aluno já tem:
 * ela continua válida mesmo se for desativada depois (nunca bloqueia salvar outros campos da ficha).
 */
export async function assertSelectableRank(rankKey: string | null | undefined, keepKey?: string | null): Promise<void> {
  if (!rankKey || rankKey === keepKey) return;
  const rank = findRank(await getBeltRanks(), rankKey);
  if (!rank) throw new Error("rank_invalid");
  if (!rank.enabled) throw new Error("rank_disabled");
}
