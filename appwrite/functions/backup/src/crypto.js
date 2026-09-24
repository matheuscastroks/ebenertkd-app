import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function readEncryptionKey() {
  const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("backup_encryption_key_invalid");
  return key;
}

export function encryptBuffer(plaintext, key = readEncryptionKey()) {
  const source = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(source), cipher.final()]);
  const envelope = Buffer.from(JSON.stringify({ version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), plaintextSha256: sha256(source), data: ciphertext.toString("base64") }));
  return { envelope, plaintextSha256: sha256(source), ciphertextSha256: sha256(envelope), plaintextBytes: source.length };
}

export function decryptBuffer(envelope, key = readEncryptionKey()) {
  const parsed = JSON.parse(Buffer.from(envelope).toString("utf8"));
  if (parsed.version !== 1 || parsed.algorithm !== "aes-256-gcm") throw new Error("backup_envelope_unsupported");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(parsed.data, "base64")), decipher.final()]);
  if (sha256(plaintext) !== parsed.plaintextSha256) throw new Error("backup_plaintext_hash_mismatch");
  return plaintext;
}
