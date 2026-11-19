import "server-only";

import { Query, type Models } from "node-appwrite";
import { DEFAULT_POLICIES, type AcademyPolicies, type PolicySection } from "@/features/academy/defaults";
import { resolveAcademyIdentity, type AcademyIdentityRow, type ResolvedAcademyIdentity } from "@/features/academy/identity-rules";
import { policyRevision, resolvePolicies, type PolicyRow } from "@/features/academy/policy-rules";
import { defaultPolicySection } from "@/features/academy/schemas";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { safeErrorMessage } from "@/lib/security/safe-error";

/** Falhas de leitura da configuração nunca derrubam a página: cai nos defaults e registra sem conteúdo. */
function logConfigFailure(scope: string, error: unknown) {
  console.error(`[academy-config] ${scope}: ${safeErrorMessage(error)}`);
}

function readIdentityRow() {
  return cachedRead({ name: "academy-identity", key: [], tags: [CACHE_TAGS.academySettings], revalidate: 3600 }, async () => {
    const { tables, config } = createAppwriteAdminClient();
    const result = await tables.listRows<Models.Row & AcademyIdentityRow>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.academySettings,
      queries: [Query.limit(1)]
    });
    return result.rows[0] ?? null;
  });
}

function readPolicyRows() {
  return cachedRead({ name: "academy-policies", key: [], tags: [CACHE_TAGS.academyPolicies], revalidate: 3600 }, async () => {
    const { tables, config } = createAppwriteAdminClient();
    const result = await tables.listRows<Models.Row & PolicyRow>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.academyPolicies,
      queries: [Query.limit(50)]
    });
    return result.rows.map(({ section, schema_version, data_json, revision }) => ({ section, schema_version, data_json, revision }));
  });
}

/** Identidade da academia. Nunca lança: sem linha ou com falha de rede devolve os defaults atuais. */
export async function getAcademyIdentity(): Promise<ResolvedAcademyIdentity> {
  try {
    return resolveAcademyIdentity(await readIdentityRow());
  } catch (error) {
    logConfigFailure("identity", error);
    return resolveAcademyIdentity(null);
  }
}

/** Políticas resolvidas (billing, access, contract). Nunca lança. */
export async function getAcademyPolicies(): Promise<AcademyPolicies> {
  try {
    return resolvePolicies(await readPolicyRows());
  } catch (error) {
    logConfigFailure("policies", error);
    return resolvePolicies(null);
  }
}

export async function getPolicy<S extends PolicySection>(section: S): Promise<AcademyPolicies[S]> {
  try {
    return (await getAcademyPolicies())[section];
  } catch {
    return defaultPolicySection(section);
  }
}

/** Política + revisão atual, para a tela de edição (concorrência otimista). */
export async function getPolicyForEdit<S extends PolicySection>(section: S): Promise<{ policy: AcademyPolicies[S]; revision: number }> {
  try {
    const rows = await readPolicyRows();
    return { policy: resolvePolicies(rows)[section], revision: policyRevision(rows, section) };
  } catch (error) {
    logConfigFailure("policy-edit", error);
    return { policy: defaultPolicySection(section), revision: 0 };
  }
}


/** Visão geral: identidade resolvida + quais seções de política já têm configuração salva (as demais usam o padrão). */
export async function getAcademyConfigOverview() {
  const identity = await getAcademyIdentity();
  let customized: PolicySection[] = [];
  try {
    const rows = await readPolicyRows();
    customized = rows.map((row) => row.section).filter((section): section is PolicySection => section in DEFAULT_POLICIES);
  } catch (error) {
    logConfigFailure("overview", error);
  }
  return { identity, customized };
}
