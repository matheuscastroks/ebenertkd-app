import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import type { Profile } from "@/features/auth/types";
import type { ClassEnrollment, TrainingClass } from "@/features/classes/types";
import { deliverNotificationPush } from "@/features/notifications/push-service";
import type { AppNotification, InboxItem, NotificationAudience, NotificationKind, NotificationRecipient } from "@/features/notifications/types";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

const publishSchema = z.object({
  title: z.string().trim().min(3).max(128),
  body: z.string().trim().min(3).max(4000),
  audience: z.enum(["all", "class", "profile"]),
  audienceId: z.string().trim().max(36).optional(),
  actionUrl: z.string().trim().max(512).refine((value) => !value || value.startsWith("/"), "invalid_action_url").optional()
}).superRefine((value, ctx) => {
  if (value.audience !== "all" && !value.audienceId) ctx.addIssue({ code: "custom", path: ["audienceId"], message: "target_required" });
});

const stableId = (...parts: string[]) => createHash("sha256").update(parts.join(":" )).digest("hex").slice(0, 36);

async function addGuardians(profiles: Profile[]) {
  const { tables, config } = createAppwriteAdminClient();
  const result = new Map(profiles.map((profile) => [profile.$id, profile]));
  const minors = profiles.filter((profile) => profile.role === "minor_student");
  for (const minor of minors) {
    const links = await tables.listRows<{ guardian_profile_id: string } & import("node-appwrite").Models.Row>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.guardianStudentLinks, queries: [Query.equal("student_profile_id", [minor.$id]), Query.equal("status", ["active"]), Query.limit(20)] });
    for (const link of links.rows) {
      const guardian = await tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: link.guardian_profile_id });
      if (guardian.status === "active") result.set(guardian.$id, guardian);
    }
  }
  return [...result.values()];
}

async function resolveRecipients(audience: NotificationAudience, audienceId?: string) {
  const { tables, config } = createAppwriteAdminClient();
  if (audience === "all") {
    const result = await tables.listRows<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.equal("status", ["active"]), Query.limit(500)] });
    return result.rows;
  }
  if (audience === "profile" && audienceId) {
    const profile = await tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: audienceId });
    return addGuardians([profile]);
  }
  if (audience === "class" && audienceId) {
    const enrollments = await tables.listRows<ClassEnrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.classEnrollments, queries: [Query.equal("training_class_id", [audienceId]), Query.equal("status", ["active"]), Query.limit(500)] });
    const students = await Promise.all(enrollments.rows.map((row) => tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: row.student_id })));
    const profiles = await Promise.all(students.map((student) => tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: student.profile_id })));
    return addGuardians(profiles.filter((profile) => profile.status === "active"));
  }
  return [];
}

export async function createNotification(input: { kind: NotificationKind; title: string; body: string; audience: NotificationAudience; audienceId?: string; actionUrl?: string; dedupeKey: string; actorAccountId?: string; recipientProfiles: Profile[] }) {
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  let notification: AppNotification;
  try {
    notification = await tables.createRow<AppNotification>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notifications, rowId: ID.unique(), permissions: [], data: { kind: input.kind, title: input.title, body: input.body, audience: input.audience, audience_id: input.audienceId, action_url: input.actionUrl, dedupe_key: input.dedupeKey, created_by_account_id: input.actorAccountId, published_at: now, created_at: now } });
  } catch (error) {
    const existing = await tables.listRows<AppNotification>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notifications, queries: [Query.equal("dedupe_key", [input.dedupeKey]), Query.limit(1)] });
    if (!existing.rows[0]) throw error;
    notification = existing.rows[0];
  }

  for (const profile of input.recipientProfiles) {
    const rowId = stableId(notification.$id, profile.$id);
    let recipient: NotificationRecipient;
    try {
      recipient = await tables.createRow<NotificationRecipient>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationRecipients, rowId, permissions: [], data: { notification_id: notification.$id, profile_id: profile.$id, account_id: profile.account_id, created_at: now, updated_at: now } });
    } catch {
      recipient = await tables.getRow<NotificationRecipient>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationRecipients, rowId });
    }
    await deliverNotificationPush(notification, recipient).catch(() => undefined);
  }
  return notification;
}

export async function publishAnnouncement(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = publishSchema.parse(raw);
  const recipients = await resolveRecipients(input.audience, input.audienceId);
  if (recipients.length === 0) throw new Error("notification_without_recipients");
  return createNotification({ kind: "announcement", title: input.title, body: input.body, audience: input.audience, audienceId: input.audienceId, actionUrl: input.actionUrl || "/avisos", dedupeKey: `announcement:${randomUUID()}`, actorAccountId: actor.account_id, recipientProfiles: recipients });
}

export async function listInbox(profile: Profile): Promise<InboxItem[]> {
  const { tables, config } = createAppwriteAdminClient();
  const recipients = await tables.listRows<NotificationRecipient>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationRecipients, queries: [Query.equal("profile_id", [profile.$id]), Query.orderDesc("created_at"), Query.limit(100)] });
  const items = await Promise.all(recipients.rows.map(async (recipient) => ({ recipient, notification: await tables.getRow<AppNotification>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notifications, rowId: recipient.notification_id }) })));
  return items;
}

export async function markNotificationRead(profile: Profile, recipientId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const recipient = await tables.getRow<NotificationRecipient>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationRecipients, rowId: recipientId });
  if (recipient.profile_id !== profile.$id) throw new Error("notification_access_denied");
  if (!recipient.read_at) await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.notificationRecipients, rowId: recipient.$id, data: { read_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
}

export async function listNotificationAudienceOptions() {
  const { tables, config } = createAppwriteAdminClient();
  const [profiles, classes] = await Promise.all([
    tables.listRows<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.equal("status", ["active"]), Query.orderAsc("full_name"), Query.limit(500)] }),
    tables.listRows<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, queries: [Query.equal("status", ["active"]), Query.orderAsc("name"), Query.limit(100)] })
  ]);
  return { profiles: profiles.rows, classes: classes.rows };
}
