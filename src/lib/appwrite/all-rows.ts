import "server-only";

import { Query, type Models } from "node-appwrite";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

/** Carrega todas as linhas de uma tabela usando paginação por cursor. */
export async function listAllRows<Row extends Models.Row>(
  tableId: string,
  queries: string[] = [],
  batchSize = 500
): Promise<Row[]> {
  const { tables, config } = createAppwriteAdminClient();
  const rows: Row[] = [];
  let cursor: string | undefined;
  do {
    const page = await tables.listRows<Row>({
      databaseId: config.databaseId,
      tableId,
      queries: [...queries, Query.limit(batchSize), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    rows.push(...page.rows);
    cursor = page.rows.length === batchSize ? page.rows.at(-1)?.$id : undefined;
  } while (cursor);
  return rows;
}
