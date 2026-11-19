import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Query } from "node-appwrite";
import type { EarnedBadge, EarnedBadgeKind, EarnedBadgeSource } from "@/features/students/badge-rules";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { Models } from "node-appwrite";

export type StudentBadgeRow = Models.Row & {
  student_id: string;
  kind: EarnedBadgeKind;
  source: EarnedBadgeSource;
  source_id: string;
  source_key: string;
  event_id?: string | null;
  title: string;
  description?: string | null;
  awarded_at: string;
  created_at: string;
};

const rowIdOf = (sourceKey: string) => createHash("sha256").update(`badge:${sourceKey}`).digest("hex").slice(0, 36);

/**
 * Concede conquistas. Idempotente: o id da linha vem da chave `source:source_id:kind`, então conceder de novo
 * (reprocessar o resultado, concluir o evento duas vezes) não duplica. Falha de uma conquista nunca derruba o fluxo.
 */
export async function awardBadges(badges: readonly EarnedBadge[], awardedAt: string = new Date().toISOString()) {
  if (!badges.length) return 0;
  const { tables, config } = createAppwriteAdminClient();
  let created = 0;
  for (const badge of badges) {
    try {
      await tables.createRow<StudentBadgeRow>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.studentBadges,
        rowId: rowIdOf(badge.sourceKey),
        permissions: [],
        data: { student_id: badge.studentId, kind: badge.kind, source: badge.source, source_id: badge.sourceId, source_key: badge.sourceKey, event_id: badge.eventId, title: badge.title, description: badge.description, awarded_at: awardedAt, created_at: new Date().toISOString() }
      });
      created += 1;
      invalidateTags(CACHE_TAGS.studentBadges(badge.studentId));
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 409) continue;
      // Conquista é complementar: registra e segue, o resultado principal já foi gravado.
      console.error(`badge_award_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  return created;
}

/** Conquistas de eventos e exames de um aluno, mais recentes primeiro. */
export function listStudentBadges(studentId: string) {
  return cachedRead(
    { name: "list-student-badges", key: [studentId], tags: [CACHE_TAGS.studentBadges(studentId)], revalidate: 120 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<StudentBadgeRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentBadges, queries: [Query.equal("student_id", [studentId]), Query.orderDesc("awarded_at"), Query.limit(200)] });
      return result.rows;
    }
  );
}
