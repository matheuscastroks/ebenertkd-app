import { createDecipheriv, createHash } from "node:crypto";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";
import webpush from "web-push";

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
const reminderStage = (due, day) => {
  const difference = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${due.slice(0, 10)}T00:00:00Z`)) / 86400000);
  if (difference === -3) return "due_minus_3";
  if (difference === 0) return "due_today";
  if (difference === 3) return "overdue_plus_3";
  if (difference >= 10 && (difference - 3) % 7 === 0) return `overdue_weekly_${(difference - 3) / 7}`;
  return null;
};
const reminderCopy = (stage, description) => {
  if (stage === "due_minus_3") return { title: "Vencimento próximo", body: `${description} vence em 3 dias.` };
  if (stage === "due_today") return { title: "Vencimento hoje", body: `${description} vence hoje.` };
  if (stage === "overdue_plus_3") return { title: "Pagamento em atraso", body: `${description} está em atraso há 3 dias.` };
  return { title: "Pagamento pendente", body: `${description} continua em atraso. Consulte os detalhes no aplicativo.` };
};

const decryptSubscription = (value) => {
  const key = Buffer.from(process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("push_encryption_key_invalid");
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"));
};

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

async function financialRecipients(tables, studentId) {
  const student = await tables.getRow({ databaseId, tableId: "students", rowId: studentId });
  const profile = await tables.getRow({ databaseId, tableId: "profiles", rowId: student.profile_id });
  if (profile.role !== "minor_student") return [profile];
  const links = await listAll(tables, "guardian_student_links", [Query.equal("student_profile_id", [profile.$id]), Query.equal("status", ["active"])]);
  return Promise.all(links.map((link) => tables.getRow({ databaseId, tableId: "profiles", rowId: link.guardian_profile_id })));
}

async function deliverPush(tables, notification, recipient) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const subscriptions = await listAll(tables, "push_subscriptions", [Query.equal("profile_id", [recipient.profile_id]), Query.equal("status", ["active"])]);
  for (const subscription of subscriptions) {
    const rowId = eventId(`${recipient.$id}:${subscription.$id}`);
    let delivery;
    try {
      delivery = await tables.getRow({ databaseId, tableId: "notification_deliveries", rowId });
      if (delivery.status === "sent") continue;
    } catch {
      delivery = await tables.createRow({ databaseId, tableId: "notification_deliveries", rowId, permissions: [], data: { notification_id: notification.$id, recipient_id: recipient.$id, subscription_id: subscription.$id, channel: "push", status: "pending", attempts: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
    }
    try {
      await webpush.sendNotification(decryptSubscription(subscription.subscription_ciphertext), JSON.stringify({ title: "Ebenert KD", body: "Você tem um novo aviso no aplicativo.", url: "/avisos", tag: notification.$id }));
      await tables.updateRow({ databaseId, tableId: "notification_deliveries", rowId, data: { status: "sent", attempts: delivery.attempts + 1, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() } });
    } catch (cause) {
      const expired = cause?.statusCode === 404 || cause?.statusCode === 410;
      if (expired) await tables.updateRow({ databaseId, tableId: "push_subscriptions", rowId: subscription.$id, data: { status: "expired", updated_at: new Date().toISOString() } });
      await tables.updateRow({ databaseId, tableId: "notification_deliveries", rowId, data: { status: expired ? "expired" : "failed", attempts: delivery.attempts + 1, last_error: String(cause?.message ?? cause).slice(0, 1000), updated_at: new Date().toISOString() } });
    }
  }
}

async function createNotification(tables, { title, body, dedupeKey, recipients, kind = "system", actionUrl = "/avisos" }) {
  const now = new Date().toISOString();
  const notificationId = eventId(`notification:${dedupeKey}`);
  let notification;
  try {
    notification = await tables.createRow({ databaseId, tableId: "notifications", rowId: notificationId, permissions: [], data: { kind, title, body, audience: "system", action_url: actionUrl, dedupe_key: dedupeKey, published_at: now, created_at: now } });
  } catch (cause) {
    if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
    notification = await tables.getRow({ databaseId, tableId: "notifications", rowId: notificationId });
  }
  for (const profile of recipients) {
    const recipientId = eventId(`${notification.$id}:${profile.$id}`);
    let recipient;
    try {
      recipient = await tables.createRow({ databaseId, tableId: "notification_recipients", rowId: recipientId, permissions: [], data: { notification_id: notification.$id, profile_id: profile.$id, account_id: profile.account_id, created_at: now, updated_at: now } });
    } catch (cause) {
      if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
      recipient = await tables.getRow({ databaseId, tableId: "notification_recipients", rowId: recipientId });
    }
    await deliverPush(tables, notification, recipient);
  }
}

async function notifyAdmins(tables, input) {
  const admins = await listAll(tables, "profiles", [Query.equal("role", ["admin"]), Query.equal("status", ["active"])]);
  if (admins.length) await createNotification(tables, { ...input, recipients: admins });
}

async function main({ req, res, log, error }) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const idempotencyKey = `daily-operations-${day.replaceAll("-", "")}`;
  const executionKey = req.headers["x-appwrite-key"];
  if (!executionKey) return res.json({ ok: false, error: "missing_execution_key" }, 500);
  const client = new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT).setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(executionKey);
  const tables = new TablesDB(client);
  let step = "contracts";

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

    step = "monthly-charges";
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

    step = "overdue-status";
    const pendingCharges = await listAll(tables, "charges", [Query.equal("status", ["pending"])]);
    let markedOverdue = 0;
    for (const charge of pendingCharges) {
      if (charge.due_date.slice(0, 10) >= day) continue;
      await tables.updateRow({ databaseId, tableId: "charges", rowId: charge.$id, data: { status: "overdue", updated_at: now.toISOString() } });
      markedOverdue += 1;
    }

    step = "payment-reminders";
    const reminderCharges = await listAll(tables, "charges", [Query.equal("status", ["pending", "overdue"])]);
    let paymentReminders = 0;
    for (const charge of reminderCharges) {
      const stage = reminderStage(charge.due_date, day);
      if (!stage) continue;
      const recipients = await financialRecipients(tables, charge.student_id);
      if (!recipients.length) continue;
      const copy = reminderCopy(stage, charge.description);
      await createNotification(tables, { ...copy, kind: "payment_reminder", dedupeKey: `payment:${charge.$id}:${stage}`, recipients });
      paymentReminders += recipients.length;
    }

    step = "automation-run";
    await tables.createRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, permissions: [], data: { job: "daily-operations", idempotency_key: idempotencyKey, status: "completed", started_at: now.toISOString(), finished_at: new Date().toISOString(), details: JSON.stringify({ phase: 6, reminders, expired, charges_created: chargesCreated, marked_overdue: markedOverdue, payment_reminders: paymentReminders }), created_at: now.toISOString() } });
    log(`Recorded ${idempotencyKey}: ${chargesCreated} charges, ${markedOverdue} overdue`);
    return res.json({ ok: true, idempotencyKey, reminders, expired, chargesCreated, markedOverdue, paymentReminders });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) return res.json({ ok: true, duplicate: true, idempotencyKey });
    await notifyAdmins(tables, { title: "Falha na automação diária", body: "A rotina diária não foi concluída. Consulte os registros da função.", dedupeKey: `daily-operations-failed:${day}` }).catch(() => undefined);
    error(`${step}: ${cause instanceof Error ? cause.message : String(cause)}`);
    return res.json({ ok: false }, 500);
  }
}

export default main;
