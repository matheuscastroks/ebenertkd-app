import { createHash } from "node:crypto";

export const BACKUP_FORMAT_VERSION = 1;

export type BackupObjectDescriptor = {
  name: string;
  kind: "users" | "table" | "file";
  records?: number;
  bytes: number;
  plaintextSha256: string;
  ciphertextSha256: string;
};

export type BackupManifest = {
  formatVersion: number;
  backupId: string;
  sourceProjectId: string;
  databaseId: string;
  bucketId: string;
  appVersion: string;
  startedAt: string;
  completedAt: string;
  objects: BackupObjectDescriptor[];
  totals: { objects: number; records: number; bytes: number };
  missingFileReferences: string[];
};

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildBackupManifest(input: Omit<BackupManifest, "formatVersion" | "totals">): BackupManifest {
  return {
    ...input,
    formatVersion: BACKUP_FORMAT_VERSION,
    totals: {
      objects: input.objects.length,
      records: input.objects.reduce((total, object) => total + (object.records ?? 0), 0),
      bytes: input.objects.reduce((total, object) => total + object.bytes, 0)
    }
  };
}

export function missingFileReferences(referenceIds: Iterable<string>, exportedFileIds: Iterable<string>) {
  const exported = new Set(exportedFileIds);
  return [...new Set(referenceIds)].filter((id) => !exported.has(id)).sort();
}

function isoWeekKey(dateValue: string) {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export function backupIdsToDelete(backups: Array<{ id: string; date: string; complete: boolean }>) {
  const complete = backups.filter((backup) => backup.complete).sort((a, b) => b.date.localeCompare(a.date));
  const keep = new Set(complete.slice(0, 7).map((backup) => backup.id));
  const weekly = new Set<string>();
  for (const backup of complete.slice(7)) {
    const week = isoWeekKey(backup.date);
    if (weekly.size < 4 && !weekly.has(week)) {
      weekly.add(week);
      keep.add(backup.id);
    }
  }
  return complete.filter((backup) => !keep.has(backup.id)).map((backup) => backup.id);
}
