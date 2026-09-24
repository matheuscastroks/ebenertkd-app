const isoWeekKey = (dateValue) => {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return `${date.getUTCFullYear()}-${String(Math.ceil((((date - yearStart) / 86400000) + 1) / 7)).padStart(2, "0")}`;
};

export function backupIdsToDelete(backups) {
  const complete = backups.filter((backup) => backup.complete).sort((a, b) => b.date.localeCompare(a.date));
  const keep = new Set(complete.slice(0, 7).map((backup) => backup.id));
  const weekly = new Set();
  for (const backup of complete.slice(7)) {
    const week = isoWeekKey(backup.date);
    if (weekly.size < 4 && !weekly.has(week)) {
      weekly.add(week);
      keep.add(backup.id);
    }
  }
  return complete.filter((backup) => !keep.has(backup.id)).map((backup) => backup.id);
}

export function buildManifest(input) {
  return { ...input, formatVersion: 1, totals: { objects: input.objects.length, records: input.objects.reduce((total, object) => total + (object.records ?? 0), 0), bytes: input.objects.reduce((total, object) => total + object.bytes, 0) } };
}
