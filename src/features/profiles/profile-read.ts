import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";

/** Perfil muda pouco e é lido em toda requisição: 60 s, invalidado por qualquer gravação em `profiles`. */
const PROFILE_TTL_SECONDS = 60;

/**
 * Perfil de uma conta. SÓ a linha do perfil é cacheada: o chamador continua obrigado a
 * chamar `account.get()` (sem cache) e a checar `status`/`account_id` fora daqui.
 */
export function getProfileByAccountId(accountId: string): Promise<Profile | null> {
  return cachedRead(
    { name: "profile-by-account", key: [accountId], tags: [CACHE_TAGS.profiles, CACHE_TAGS.profileAccount(accountId)], revalidate: PROFILE_TTL_SECONDS },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.equal("account_id", [accountId]), Query.limit(1)] });
      return result.rows[0] ?? null;
    }
  );
}

/** Perfil por id (alvo de uma autorização, filho de um responsável). Não decide acesso sozinho. */
export function getProfileById(profileId: string): Promise<Profile> {
  return cachedRead(
    { name: "profile-by-id", key: [profileId], tags: [CACHE_TAGS.profiles, CACHE_TAGS.profile(profileId)], revalidate: PROFILE_TTL_SECONDS },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      return tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: profileId });
    }
  );
}

/** Mesma leitura, sem cache, para código de gravação que decide pelo estado atual. */
export async function readProfileById(profileId: string) {
  const { tables, config } = createAppwriteAdminClient();
  return tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: profileId });
}
