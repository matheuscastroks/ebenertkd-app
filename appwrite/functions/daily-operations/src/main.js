import { createHash } from "node:crypto";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID ?? "ebenertkd";
const eventId = (value) => createHash("sha256").update(value).digest("hex").slice(0, 36);
const daysUntil = (end, now) => Math.round((Date.parse(end.slice(0, 10) + "T00:00:00Z") - Date.parse(now.slice(0, 10) + "T00:00:00Z")) / 86400000);

async function main({ res, log, error }) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const idempotencyKey = `daily-operations-${day.replaceAll("-", "")}`;
  const client = new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT).setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(process.env.APPWRITE_FUNCTION_API_KEY);
  const tables = new TablesDB(client);

  try {
    const contracts = await tables.listRows({ databaseId, tableId: "contracts", queries: [Query.equal("status", ["signed"]), Query.limit(500)] });
    let reminders = 0;
    let expired = 0;
    for (const contract of contracts.rows) {
      const days = daysUntil(contract.ends_at, day);
      if (days === 30 || days === 7) {
        const key = `contract.renewal_${days}:${contract.$id}:${day}`;
        try {
          await tables.createRow({ databaseId, tableId: "audit_events", rowId: eventId(key), permissions: [], data: { event_type: `contract.renewal_${days}`, entity_type: "contract", entity_id: contract.$id, metadata: JSON.stringify({ days, student_id: contract.student_id }), created_at: now.toISOString() } });
          reminders += 1;
        } catch (cause) {
          if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
        }
      }
      if (days < 0) {
        await tables.updateRow({ databaseId, tableId: "contracts", rowId: contract.$id, data: { status: "expired", updated_at: now.toISOString() } });
        await tables.updateRow({ databaseId, tableId: "enrollments", rowId: contract.enrollment_id, data: { status: "awaiting_renewal", updated_at: now.toISOString() } });
        expired += 1;
      }
    }
    await tables.createRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, permissions: [], data: { job: "daily-operations", idempotency_key: idempotencyKey, status: "completed", started_at: now.toISOString(), finished_at: new Date().toISOString(), details: JSON.stringify({ phase: 3, reminders, expired }), created_at: now.toISOString() } });
    log(`Recorded ${idempotencyKey}: ${reminders} reminders, ${expired} expirations`);
    return res.json({ ok: true, idempotencyKey, reminders, expired });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) return res.json({ ok: true, duplicate: true, idempotencyKey });
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ ok: false }, 500);
  }
}

export default main;
