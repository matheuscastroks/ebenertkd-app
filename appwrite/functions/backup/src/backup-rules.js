const isoWeekKey = (dateValue) => {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return `${date.getUTCFullYear()}-${String(Math.ceil((((date - yearStart) / 86400000) + 1) / 7)).padStart(2, "0")}`;
};

export const backupTableIds = ["profiles", "guardian_student_links", "training_classes", "class_enrollments", "lessons", "attendance_records", "exam_events", "exam_participants", "belt_history", "students", "enrollments", "student_documents", "parq_submissions", "enrollment_reviews", "contract_templates", "contract_versions", "contracts", "contract_signatures", "cancellation_requests", "charges", "payment_proofs", "payments", "payment_reversals", "billing_settings", "notifications", "notification_recipients", "notification_preferences", "push_subscriptions", "notification_deliveries", "audit_events", "automation_runs"];

// Mantém as 7 cópias completas mais recentes (diárias) e, além delas, a mais recente de
// cada uma das 4 semanas ISO anteriores que ainda não tem cópia diária. Pastas incompletas
// só são removidas quando já existe uma cópia completa mais nova que elas.
export function backupIdsToDelete(backups) {
  const complete = backups.filter((backup) => backup.complete).sort((a, b) => b.date.localeCompare(a.date));
  const keep = new Set(complete.slice(0, 7).map((backup) => backup.id));
  const seenWeeks = new Set(complete.slice(0, 7).map((backup) => isoWeekKey(backup.date)));
  let weeklyKept = 0;
  for (const backup of complete.slice(7)) {
    const week = isoWeekKey(backup.date);
    if (weeklyKept < 4 && !seenWeeks.has(week)) {
      seenWeeks.add(week);
      weeklyKept += 1;
      keep.add(backup.id);
    }
  }
  const newestComplete = complete[0]?.date.slice(0, 10);
  const staleIncomplete = newestComplete
    ? backups.filter((backup) => !backup.complete && backup.date.slice(0, 10) < newestComplete).map((backup) => backup.id)
    : [];
  return [...complete.filter((backup) => !keep.has(backup.id)).map((backup) => backup.id), ...staleIncomplete];
}

export function buildManifest(input) {
  return { ...input, formatVersion: 1, totals: { objects: input.objects.length, records: input.objects.reduce((total, object) => total + (object.records ?? 0), 0), bytes: input.objects.reduce((total, object) => total + object.bytes, 0) } };
}
