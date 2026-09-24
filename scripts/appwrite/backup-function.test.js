import { describe, expect, it } from "vitest";
import { backupIdsToDelete, buildManifest } from "../../appwrite/functions/backup/src/backup-rules.js";
import { decryptBuffer, encryptBuffer, sha256 } from "../../appwrite/functions/backup/src/crypto.js";

describe("backup function primitives", () => {
  const key = Buffer.alloc(32, 9);

  it("encrypts every object with a unique authenticated nonce", () => {
    const first = encryptBuffer(Buffer.from("sensitive"), key);
    const second = encryptBuffer(Buffer.from("sensitive"), key);
    expect(first.ciphertextSha256).not.toBe(second.ciphertextSha256);
    expect(decryptBuffer(first.envelope, key).toString()).toBe("sensitive");
  });

  it("rejects a corrupted encrypted object", () => {
    const encrypted = encryptBuffer(Buffer.from("sensitive"), key);
    const envelope = JSON.parse(encrypted.envelope.toString());
    envelope.data = Buffer.from("corrupted").toString("base64");
    expect(() => decryptBuffer(Buffer.from(JSON.stringify(envelope)), key)).toThrow();
  });

  it("builds totals and never selects incomplete folders for deletion", () => {
    const object = { name: "users.json.enc", kind: "users", records: 2, bytes: 20, plaintextSha256: sha256("users"), ciphertextSha256: sha256("cipher") };
    expect(buildManifest({ objects: [object] }).totals).toEqual({ objects: 1, records: 2, bytes: 20 });
    expect(backupIdsToDelete([{ id: "pending", date: "2026-01-01", complete: false }])).toEqual([]);
  });
});
