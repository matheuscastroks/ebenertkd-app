import { loadEnvConfig } from "@next/env";
import { AppwriteException, Client, Query, Storage, TablesDB, Users } from "node-appwrite";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";

/**
 * Apaga o banco de dados do app e os arquivos do bucket privado, para recriar tudo com `npm run infra:apply`.
 * Só para ambiente de desenvolvimento, antes do lançamento.
 *
 *   tsx scripts/appwrite/reset.ts plan          → só mostra o que existe (nada é apagado)
 *   tsx scripts/appwrite/reset.ts apply --yes   → apaga o banco e os arquivos do bucket
 *   ... apply --yes --users                     → também apaga todas as contas de login (Auth)
 *
 * Depois: `npm run infra:apply` e `npm run appwrite:seed-test-users` (recria as contas de teste).
 */
loadEnvConfig(process.cwd());

const mode = process.argv[2];
const confirmed = process.argv.includes("--yes");
if (mode !== "plan" && mode !== "apply") {
  throw new Error("Use: tsx scripts/appwrite/reset.ts <plan|apply --yes>");
}
if (mode === "apply" && !confirmed) {
  throw new Error("Para apagar, rode com --yes.");
}

const config = readServerAppwriteConfig();
const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
const tablesDb = new TablesDB(client);
const storage = new Storage(client);
const users = new Users(client);

function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404;
}

async function inventory() {
  let tableCount = 0;
  let rowCount = 0;
  try {
    const tables = await tablesDb.listTables({ databaseId: config.databaseId, queries: [Query.limit(100)] });
    tableCount = tables.total;
    for (const table of tables.tables) {
      const rows = await tablesDb.listRows({ databaseId: config.databaseId, tableId: table.$id, queries: [Query.limit(1)] });
      rowCount += rows.total;
    }
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  let fileCount = 0;
  try {
    fileCount = (await storage.listFiles({ bucketId: config.bucketId, queries: [Query.limit(1)] })).total;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  const userCount = (await users.list({ queries: [Query.limit(1)] })).total;
  return { tableCount, rowCount, fileCount, userCount };
}

async function deleteBucketFiles() {
  let deleted = 0;
  for (;;) {
    const page = await storage.listFiles({ bucketId: config.bucketId, queries: [Query.limit(100)] });
    if (page.files.length === 0) return deleted;
    for (const file of page.files) {
      await storage.deleteFile({ bucketId: config.bucketId, fileId: file.$id });
      deleted += 1;
    }
  }
}

async function deleteAllUsers() {
  let deleted = 0;
  for (;;) {
    const page = await users.list({ queries: [Query.limit(100)] });
    if (page.users.length === 0) return deleted;
    for (const user of page.users) {
      await users.delete({ userId: user.$id });
      deleted += 1;
    }
  }
}

async function main() {
  const before = await inventory();
  console.log(
    `Banco: ${before.tableCount} tabelas, ${before.rowCount} linhas. Bucket: ${before.fileCount} arquivos. Contas de login: ${before.userCount}${process.argv.includes("--users") ? "" : " (mantidas)"}.`
  );
  if (mode === "plan") return;

  try {
    await tablesDb.delete({ databaseId: config.databaseId });
    console.log("Banco apagado.");
  } catch (error) {
    if (!isNotFound(error)) throw error;
    console.log("Banco já não existia.");
  }
  try {
    console.log(`Arquivos apagados do bucket: ${await deleteBucketFiles()}.`);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  if (process.argv.includes("--users")) {
    console.log(`Contas de login apagadas: ${await deleteAllUsers()}.`);
  }
  console.log("Pronto. Rode `npm run infra:apply` para recriar.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
