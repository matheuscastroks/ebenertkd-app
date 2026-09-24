import { createHash } from "node:crypto";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";

const databaseId = process.env.APPWRITE_DATABASE_ID ?? "ebenertkd";
const eventId = (value) => createHash("sha256").update(value).digest("hex").slice(0, 36);
const chargeId = (enrollmentId, type, competence, originId) => eventId(`${enrollmentId}:${type}:${competence}:${originId}`);
const daysUntil = (end, now) => Math.round((Date.parse(end.slice(0, 10) + "T00:00:00Z") - Date.parse(now.slice(0, 10) + "T00:00:00Z")) / 86400000);
const competenceOf = (date) => date.slice(0, 7);
const nextCompetence = (competence) => {
  const [year, month] = competence.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
};
const dueDate = (competence, dueDay) => {
  const [year, month] = competence.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(dueDay, last)).padStart(2, "0")}`;
};
const withinContract = (competence, contract) => {
  const [year, month] = competence.split("-").map(Number);
  const first = `${competence}-01`;
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return last >= contract.starts_at.slice(0, 10) && first <= contract.ends_at.slice(0, 10);
};
const shouldGenerate = (competence, day) => Date.parse(`${day}T00:00:00Z`) >= Date.parse(`${competence}-01T00:00:00Z`) - 7 * 86400000;

async function listAll(tables, tableId, queries = []) {
  const rows = [];
  let cursor;
  do {
    const page = await tables.listRows({ databaseId, tableId, queries: [...queries, Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...page.rows);
    cursor = page.rows.length === 500 ? page.rows.at(-1).$id : undefined;
  } while (cursor);
  return rows;
}

async function main({ res, log, error }) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const idempotencyKey = `daily-operations-${day.replaceAll("-", "")}`;
  const client = new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT).setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(process.env.APPWRITE_FUNCTION_API_KEY);
  const tables = new TablesDB(client);

  try {
    const contracts = { rows: await listAll(tables, "contracts", [Query.equal("status", ["signed"])]) };
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

    const enrollments = await listAll(tables, "enrollments", [Query.equal("status", ["active"])]);
    const signedByEnrollment = new Map(contracts.rows.filter((contract) => daysUntil(contract.ends_at, day) >= 0).map((contract) => [contract.enrollment_id, contract]));
    let chargesCreated = 0;
    const competences = [competenceOf(day), nextCompetence(competenceOf(day))];
    for (const enrollment of enrollments) {
      const contract = signedByEnrollment.get(enrollment.$id);
      if (!contract || !enrollment.approved_due_day) continue;
      for (const competence of competences) {
        if (!shouldGenerate(competence, day) || !withinContract(competence, contract)) continue;
        const rowId = chargeId(enrollment.$id, "monthly_fee", competence, contract.$id);
        try {
          await tables.createRow({ databaseId, tableId: "charges", rowId, permissions: [], data: { enrollment_id: enrollment.$id, student_id: enrollment.student_id, contract_id: contract.$id, charge_type: "monthly_fee", competence, origin_id: contract.$id, amount_cents: contract.monthly_fee_cents, due_date: `${dueDate(competence, enrollment.approved_due_day)}T12:00:00.000Z`, status: "pending", description: `Mensalidade ${competence}`, created_at: now.toISOString(), updated_at: now.toISOString() } });
          chargesCreated += 1;
        } catch (cause) {
          if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
        }
      }
    }

    const pendingCharges = await listAll(tables, "charges", [Query.equal("status", ["pending"])]);
    let markedOverdue = 0;
    for (const charge of pendingCharges) {
      if (charge.due_date.slice(0, 10) >= day) continue;
      await tables.updateRow({ databaseId, tableId: "charges", rowId: charge.$id, data: { status: "overdue", updated_at: now.toISOString() } });
      markedOverdue += 1;
    }

    await tables.createRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, permissions: [], data: { job: "daily-operations", idempotency_key: idempotencyKey, status: "completed", started_at: now.toISOString(), finished_at: new Date().toISOString(), details: JSON.stringify({ phase: 4, reminders, expired, charges_created: chargesCreated, marked_overdue: markedOverdue }), created_at: now.toISOString() } });
    log(`Recorded ${idempotencyKey}: ${chargesCreated} charges, ${markedOverdue} overdue`);
    return res.json({ ok: true, idempotencyKey, reminders, expired, chargesCreated, markedOverdue });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) return res.json({ ok: true, duplicate: true, idempotencyKey });
    error(cause instanceof Error ? cause.message : String(cause));
    return res.json({ ok: false }, 500);
  }
}

export default main;
