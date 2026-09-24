import { AppwriteException, Client, TablesDB } from "node-appwrite";

async function main({ res, log, error }) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  const idempotencyKey = `daily-operations-${day}`;
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);
  const tables = new TablesDB(client);

  try {
    await tables.createRow({
      databaseId: process.env.APPWRITE_DATABASE_ID ?? "ebenertkd",
      tableId: "automation_runs",
      rowId: idempotencyKey,
      permissions: [],
      data: {
        job: "daily-operations",
        idempotency_key: idempotencyKey,
        status: "completed",
        started_at: now.toISOString(),
        finished_at: new Date().toISOString(),
        details: JSON.stringify({ phase: 0 }),
        created_at: now.toISOString()
      }
    });
    log(`Recorded ${idempotencyKey}`);
    return res.json({ ok: true, idempotencyKey });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) {
      log(`Skipped duplicate ${idempotencyKey}`);
      return res.json({ ok: true, duplicate: true, idempotencyKey });
    }
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ ok: false }, 500);
  }
}

export default main;
