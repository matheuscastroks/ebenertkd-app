import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function listStudentAccessProfiles(search = "", page = 1) {
  const { tables, config } = createAppwriteAdminClient();
  const queries = [Query.contains("capabilities", ["student"]), Query.orderAsc("full_name")];
  if (search.trim()) queries.push(Query.contains("full_name", [search.trim()]));
  const result = await tables.listRows<Profile>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [...queries, Query.limit(20), Query.offset((page - 1) * 20)]
  });
  return { rows: result.rows, total: result.total };
}

export async function listMinorProfiles() {
  const { tables, config } = createAppwriteAdminClient();
  const rows: Profile[] = [];
  let cursor: string | undefined;
  do {
    const page = await tables.listRows<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.equal("role", ["minor_student"]), Query.equal("status", ["active"]), Query.orderAsc("full_name"), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...page.rows);
    cursor = page.rows.length === 500 ? page.rows.at(-1)?.$id : undefined;
  } while (cursor);
  return rows;
}
