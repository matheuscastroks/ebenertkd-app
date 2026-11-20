import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { deadlineReminder, deadlineReminderCopy, deadlineReminderKey } from "@/features/events/rules/deadline-rules";
import { isActiveRegistration } from "@/features/events/rules/status-rules";
import type { Event, EventDeadline, EventRegistration } from "@/features/events/types";
import { notifyAdmins, notifyStudentEvent } from "@/features/notifications/notification-service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { adminEventPath, guardianEventsPath, ROUTES } from "@/lib/navigation/routes";

/**
 * Lembretes dos prazos do cronograma (filiação, inscrição, troca de categoria, pesagem) pelo sistema de avisos.
 * Vai para a professora e para quem está na equipe (interesse, confirmado). Idempotente: cada prazo e etapa tem
 * uma única chave, então rodar de novo no mesmo dia não duplica. A rotina diária da Function aplica a mesma regra.
 */
export async function sendEventDeadlineReminders(actor: Profile | null, now: Date = new Date()) {
  if (actor && actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const events = (await tables.listRows<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.equal("event_type", ["championship", "seminar", "social", "other"]), Query.equal("status", ["published", "registration_open", "registration_closed", "in_progress"]), Query.limit(200)] })).rows;
  if (!events.length) return { sent: 0 };
  const deadlines = (await tables.listRows<EventDeadline>({ databaseId, tableId: APPWRITE_IDS.tables.eventDeadlines, queries: [Query.equal("event_id", events.map((event) => event.$id)), Query.limit(1000)] })).rows;
  const eventById = new Map(events.map((event) => [event.$id, event]));
  let sent = 0;
  for (const deadline of deadlines) {
    const reminder = deadlineReminder(deadline, now);
    const event = eventById.get(deadline.event_id);
    if (!reminder || !event) continue;
    const copy = deadlineReminderCopy(deadline, event.title, reminder);
    const dedupeKey = deadlineReminderKey(deadline.$id, reminder.stage);
    await notifyAdmins({ ...copy, dedupeKey: `${dedupeKey}:admin`, actionUrl: adminEventPath(event.$id) }).catch(() => undefined);
    const registrations = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows;
    for (const registration of registrations) {
      if (!registration.student_id || !isActiveRegistration(registration.status) || ["completed", "no_show"].includes(registration.status)) continue;
      await notifyStudentEvent({ studentId: registration.student_id, audience: "family", title: copy.title, body: copy.body, dedupeKey: `${dedupeKey}:${registration.student_id}`, studentActionUrl: ROUTES.studentEvents, guardianActionUrl: guardianEventsPath }).catch(() => undefined);
      sent += 1;
    }
  }
  if (actor) await writeAuditEvent("event.deadline_reminders.sent", actor.account_id, "event", "all", { recipients: sent });
  return { sent };
}
