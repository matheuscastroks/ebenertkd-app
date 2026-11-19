import { createDecipheriv, createHash } from "node:crypto";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";
import webpush from "web-push";
import { DEFAULT_PREFERENCES, pushAllowed, pushPayload } from "./push-rules.js";
import { safeErrorMessage } from "./safe-error.js";
import { resolvePolicies } from "./policy-defaults.js";
import { eventDeadlineStage, parqExpiryDay, parqReminderStage, pendingReminder, processingDays, reminderCopy, renewalReminderDays, shouldGenerate } from "./reminders.js";

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

/** Lê `academy_policies` uma vez por execução. Falha ou ausência de linhas usam os defaults (nunca derruba a rotina). */
async function loadPolicies(tables) {
  try {
    const rows = await listAll(tables, "academy_policies");
    return resolvePolicies(rows);
  } catch (cause) {
    console.error(`policies_unavailable: ${safeErrorMessage(cause)}`);
    return resolvePolicies([]);
  }
}

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

async function preferencesFor(tables, accountId) {
  try {
    return await tables.getRow({ databaseId, tableId: "notification_preferences", rowId: accountId });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 404) return DEFAULT_PREFERENCES;
    throw cause;
  }
}

async function deliverPush(tables, notification, recipient) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT || !process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY) return;
  // Falha fechada: se não der para ler a preferência, não envia push (o aviso segue na caixa interna).
  let preferences;
  try {
    preferences = await preferencesFor(tables, recipient.account_id);
  } catch (cause) {
    console.error(`push_preferences_unavailable: ${safeErrorMessage(cause)}`);
    return;
  }
  if (!pushAllowed(notification.kind, preferences)) return;
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
      await webpush.sendNotification(decryptSubscription(subscription.subscription_ciphertext), JSON.stringify(pushPayload(notification)));
      await tables.updateRow({ databaseId, tableId: "notification_deliveries", rowId, data: { status: "sent", attempts: delivery.attempts + 1, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() } });
    } catch (cause) {
      const expired = cause?.statusCode === 404 || cause?.statusCode === 410;
      if (expired) await tables.updateRow({ databaseId, tableId: "push_subscriptions", rowId: subscription.$id, data: { status: "expired", updated_at: new Date().toISOString() } });
      await tables.updateRow({ databaseId, tableId: "notification_deliveries", rowId, data: { status: expired ? "expired" : "failed", attempts: delivery.attempts + 1, last_error: safeErrorMessage(cause), updated_at: new Date().toISOString() } });
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
    try {
      await deliverPush(tables, notification, recipient);
    } catch (cause) {
      // O push é complementar: falha aqui não pode abortar a rotina nem os demais destinatários.
      console.error(`push_delivery_failed: ${safeErrorMessage(cause)}`);
    }
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
  let step = "policies";

  try {
    const policies = await loadPolicies(tables);
    step = "last-run";
    const lastRuns = await tables.listRows({ databaseId, tableId: "automation_runs", queries: [Query.equal("job", ["daily-operations"]), Query.orderDesc("$createdAt"), Query.limit(10)] });
    const lastRun = lastRuns.rows.find((row) => row.status === "completed" && row.started_at.slice(0, 10) < day);
    const coveredDays = processingDays(lastRun?.started_at.slice(0, 10), day);

    step = "contracts";
    const contracts = { rows: await listAll(tables, "contracts", [Query.equal("status", ["signed"])]) };
    let reminders = 0;
    let expired = 0;
    for (const contract of contracts.rows) {
      const days = daysUntil(contract.ends_at, day);
      for (const { day: reminderDay, left } of renewalReminderDays(contract.ends_at, coveredDays, day, policies.contract.renewal_reminder_days)) {
        const key = `contract.renewal_${left}:${contract.$id}:${reminderDay}`;
        try {
          await tables.createRow({ databaseId, tableId: "audit_events", rowId: eventId(key), permissions: [], data: { event_type: `contract.renewal_${left}`, entity_type: "contract", entity_id: contract.$id, metadata: JSON.stringify({ days: left, student_id: contract.student_id }), created_at: now.toISOString() } });
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
        if (!shouldGenerate(competence, day, policies.billing.charge_lead_days) || !withinContract(competence, contract)) continue;
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
      const reminder = pendingReminder(charge.due_date, coveredDays, day, policies.notifications);
      if (!reminder) continue;
      const { stage, daysLeft } = reminder;
      const recipients = await financialRecipients(tables, charge.student_id);
      if (!recipients.length) continue;
      const copy = reminderCopy(stage, charge.description, daysLeft);
      await createNotification(tables, { ...copy, kind: "payment_reminder", dedupeKey: `payment:${charge.$id}:${stage}`, recipients });
      paymentReminders += recipients.length;
    }

    step = "parq-reminders";
    let parqReminders = 0;
    try {
      const parqRows = await listAll(tables, "parq_submissions");
      const latestParqByStudent = new Map();
      for (const row of parqRows) {
        const existing = latestParqByStudent.get(row.student_id);
        if (!existing || row.signed_at > existing.signed_at) {
          latestParqByStudent.set(row.student_id, row);
        }
      }
      for (const enrollment of enrollments) {
        const latestParq = latestParqByStudent.get(enrollment.student_id);
        if (!latestParq || !latestParq.signed_at) continue;
        // Validade e dias de lembrete são da política atual da academia (não a data gravada na assinatura).
        const left = daysUntil(parqExpiryDay(latestParq.signed_at, policies.compliance.parq_validity_days), day);
        const stage = parqReminderStage(left, policies.compliance.parq_reminder_days);
        if (!stage) continue;
        const recipients = await financialRecipients(tables, enrollment.student_id);
        if (!recipients.length) continue;
        const title = stage === "expired"
          ? "PAR-Q anual vencido"
          : `PAR-Q anual vence em ${left} dias`;
        const body = stage === "expired"
          ? "Seu questionário anual de prontidão para atividade física (PAR-Q) venceu hoje. Preencha e assine a renovação no portal."
          : `Seu questionário anual de prontidão para atividade física (PAR-Q) vence em ${left} dias. Renove pelo portal para manter sua ficha em dia.`;
        await createNotification(tables, {
          kind: "system",
          title,
          body,
          actionUrl: "/aluno/parq",
          dedupeKey: `parq:${latestParq.$id}:${stage}`,
          recipients
        });
        parqReminders += recipients.length;
      }
    } catch (cause) {
      if (!(cause instanceof AppwriteException) || cause.code !== 404) throw cause;
    }

    step = "event-deadline-reminders";
    let eventReminders = 0;
    try {
      const upcomingEvents = await listAll(tables, "events", [Query.equal("status", ["published", "registration_open", "registration_closed", "in_progress"])]);
      const eventsById = new Map(upcomingEvents.map((event) => [event.$id, event]));
      const deadlines = eventsById.size ? await listAll(tables, "event_deadlines", [Query.equal("event_id", [...eventsById.keys()])]) : [];
      for (const deadline of deadlines) {
        const due = eventDeadlineStage(deadline.due_at, deadline.notify_days_before, day);
        const event = eventsById.get(deadline.event_id);
        if (!due || !event) continue;
        const days = `${due.daysLeft} ${due.daysLeft === 1 ? "dia" : "dias"}`;
        const title = due.stage === "today" ? `Prazo hoje: ${deadline.label}` : `Prazo em ${days}: ${deadline.label}`;
        const body = due.stage === "today" ? `${event.title}: o prazo de ${deadline.label.toLowerCase()} termina hoje.` : `${event.title}: o prazo de ${deadline.label.toLowerCase()} termina em ${days}.`;
        const key = `event-deadline:${deadline.$id}:${due.stage}`;
        await notifyAdmins(tables, { title, body, dedupeKey: `${key}:admin`, actionUrl: `/admin/eventos/${event.$id}` });
        const registrations = await listAll(tables, "event_registrations", [Query.equal("event_id", [event.$id]), Query.equal("status", ["interested", "pending_approval", "confirmed", "waitlisted", "checked_in"])]);
        for (const registration of registrations) {
          if (!registration.student_id) continue;
          const recipients = await financialRecipients(tables, registration.student_id);
          if (!recipients.length) continue;
          await createNotification(tables, { title, body, dedupeKey: `${key}:${registration.student_id}`, recipients, actionUrl: "/aluno/eventos" });
          eventReminders += recipients.length;
        }
      }
    } catch (cause) {
      if (!(cause instanceof AppwriteException) || cause.code !== 404) throw cause;
    }

    step = "automation-run";
    await tables.createRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, permissions: [], data: { job: "daily-operations", idempotency_key: idempotencyKey, status: "completed", started_at: now.toISOString(), finished_at: new Date().toISOString(), details: JSON.stringify({ phase: 6, reminders, expired, charges_created: chargesCreated, marked_overdue: markedOverdue, payment_reminders: paymentReminders, parq_reminders: parqReminders, event_reminders: eventReminders, covered_days: coveredDays.length }), created_at: now.toISOString() } });
    log(`Recorded ${idempotencyKey}: ${chargesCreated} charges, ${markedOverdue} overdue, ${parqReminders} parq reminders`);
    return res.json({ ok: true, idempotencyKey, reminders, expired, chargesCreated, markedOverdue, paymentReminders, parqReminders });
  } catch (cause) {
    if (cause instanceof AppwriteException && cause.code === 409) return res.json({ ok: true, duplicate: true, idempotencyKey });
    await notifyAdmins(tables, { title: "Falha na automação diária", body: "A rotina diária não foi concluída. Consulte os registros da função.", dedupeKey: `daily-operations-failed:${day}` }).catch(() => undefined);
    error(`${step}: ${safeErrorMessage(cause)}`);
    return res.json({ ok: false }, 500);
  }
}

export default main;
