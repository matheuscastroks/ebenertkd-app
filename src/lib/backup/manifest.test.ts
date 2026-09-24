import { describe, expect, it } from "vitest";
import { backupIdsToDelete, buildBackupManifest, missingFileReferences, sha256 } from "./manifest";

describe("backup manifest", () => {
  it("calculates deterministic totals and hashes", () => {
    const objects = [
      { name: "tables/profiles.json.enc", kind: "table" as const, records: 3, bytes: 120, plaintextSha256: sha256("profiles"), ciphertextSha256: sha256("cipher-1") },
      { name: "files/photo.enc", kind: "file" as const, bytes: 80, plaintextSha256: sha256("photo"), ciphertextSha256: sha256("cipher-2") }
    ];
    const manifest = buildBackupManifest({ backupId: "backup-20260924", sourceProjectId: "source", databaseId: "db", bucketId: "bucket", appVersion: "0.1.0", startedAt: "2026-09-24T03:45:00Z", completedAt: "2026-09-24T03:46:00Z", objects, missingFileReferences: [] });
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.totals).toEqual({ objects: 2, records: 3, bytes: 200 });
  });

  it("reports referenced private files that were not exported", () => {
    expect(missingFileReferences(["photo", "certificate", "photo"], ["photo"])).toEqual(["certificate"]);
  });

  it("keeps seven recent daily copies and four older weekly copies", () => {
    const backups = Array.from({ length: 50 }, (_, index) => ({ id: `backup-${index}`, date: new Date(Date.UTC(2026, 8, 30 - index)).toISOString(), complete: true }));
    const deleted = backupIdsToDelete(backups);
    expect(deleted).toHaveLength(39);
    expect(deleted).not.toContain("backup-0");
    expect(deleted).not.toContain("backup-6");
  });

  it("never deletes incomplete folders through complete-backup retention", () => {
    expect(backupIdsToDelete([{ id: "incomplete", date: "2026-01-01", complete: false }])).toEqual([]);
  });
});
