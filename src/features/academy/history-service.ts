import "server-only";

import type { Profile } from "@/features/auth/types";
import { listConfigRevisionRows } from "@/features/academy/config-admin-service";
import { buildHistory, type HistoryEntry } from "@/features/academy/history-rules";
import { safeErrorMessage } from "@/lib/security/safe-error";

/** Linha do tempo das alterações de configuração (só admin). Falha de leitura devolve lista vazia. */
export async function getConfigHistory(actor: Profile): Promise<HistoryEntry[]> {
  if (actor.role !== "admin") throw new Error("admin_required");
  try {
    return buildHistory(await listConfigRevisionRows(actor));
  } catch (error) {
    console.error(`[academy-history] ${safeErrorMessage(error)}`);
    return [];
  }
}
