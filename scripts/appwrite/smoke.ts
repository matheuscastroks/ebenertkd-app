import { loadEnvConfig } from "@next/env";
import { Client, ID, Storage, TablesDB } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

loadEnvConfig(process.cwd());

const config = readServerAppwriteConfig();
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const tables = new TablesDB(client);
const storage = new Storage(client);

async function run() {
  const suffix = Date.now().toString(36);
  const rowId = `smoke-${suffix}`;
  const fileId = `smoke-${suffix}`;
  const payload = `ebenertkd-smoke-${suffix}`;
  let rowCreated = false;
  let fileCreated = false;

  try {
    const transaction = await tables.createTransaction({ ttl: 60 });
    await tables.createRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.auditEvents,
      rowId,
      transactionId: transaction.$id,
      permissions: [],
      data: {
        event_type: "infrastructure.smoke",
        entity_type: "diagnostic",
        entity_id: rowId,
        metadata: JSON.stringify({ safe: true }),
        created_at: new Date().toISOString()
      }
    });
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
    rowCreated = true;

    const row = await tables.getRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.auditEvents,
      rowId
    });
    if (row.event_type !== "infrastructure.smoke") {
      throw new Error("Transaction smoke row did not round-trip correctly.");
    }

    await storage.createFile({
      bucketId: config.bucketId,
      fileId,
      file: InputFile.fromPlainText(payload, "smoke.txt"),
      permissions: []
    });
    fileCreated = true;
    const downloaded = await storage.getFileDownload({ bucketId: config.bucketId, fileId });
    if (Buffer.from(downloaded).toString("utf8") !== payload) {
      throw new Error("Private file smoke download did not match upload.");
    }

    console.log("Smoke test passed: transaction, private upload and download.");
  } finally {
    if (fileCreated) await storage.deleteFile({ bucketId: config.bucketId, fileId });
    if (rowCreated) {
      await tables.deleteRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.auditEvents,
        rowId
      });
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

