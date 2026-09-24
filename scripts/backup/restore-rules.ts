import { createDecipheriv, createHash } from "node:crypto";
import type { BackupManifest, BackupObjectDescriptor } from "../../src/lib/backup/manifest";

export type RestoreTarget = {
  sourceProjectId: string;
  productionProjectId?: string;
  targetProjectId: string;
  confirmedProjectId?: string;
  apply: boolean;
};

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

export function readBackupKey(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64.");
  return key;
}

export function decryptAndVerify(
  envelope: Uint8Array,
  descriptor: Pick<BackupObjectDescriptor, "name" | "plaintextSha256" | "ciphertextSha256">,
  key: Uint8Array
) {
  const source = Buffer.from(envelope);
  if (sha256(source) !== descriptor.ciphertextSha256) {
    throw new Error(`Hash cifrado inválido: ${descriptor.name}`);
  }
  const parsed = JSON.parse(source.toString("utf8")) as {
    version: number;
    algorithm: string;
    iv: string;
    tag: string;
    plaintextSha256: string;
    data: string;
  };
  if (parsed.version !== 1 || parsed.algorithm !== "aes-256-gcm") {
    throw new Error(`Envelope não suportado: ${descriptor.name}`);
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final()
  ]);
  const plaintextHash = sha256(plaintext);
  if (plaintextHash !== parsed.plaintextSha256 || plaintextHash !== descriptor.plaintextSha256) {
    throw new Error(`Hash original inválido: ${descriptor.name}`);
  }
  return plaintext;
}

export function assertSafeRestoreTarget(target: RestoreTarget) {
  if (!target.targetProjectId) throw new Error("RESTORE_APPWRITE_PROJECT_ID é obrigatório.");
  if (target.targetProjectId === target.sourceProjectId) {
    throw new Error("O projeto de destino deve ser diferente do projeto que originou o backup.");
  }
  if (target.productionProjectId && target.targetProjectId === target.productionProjectId) {
    throw new Error("Restauração no projeto de produção é bloqueada.");
  }
  if (target.apply && target.confirmedProjectId !== target.targetProjectId) {
    throw new Error("Use --confirm-target=<project-id> com o ID exato do destino.");
  }
}

export function assertManifest(manifest: BackupManifest) {
  if (manifest.formatVersion !== 1) throw new Error(`Formato de backup não suportado: ${manifest.formatVersion}`);
  if (manifest.missingFileReferences.length) throw new Error("O manifesto contém referências de arquivos ausentes.");
  if (manifest.totals.objects !== manifest.objects.length) throw new Error("Total de objetos inconsistente no manifesto.");
  const names = new Set<string>();
  for (const object of manifest.objects) {
    if (names.has(object.name)) throw new Error(`Objeto duplicado no manifesto: ${object.name}`);
    names.add(object.name);
  }
}

export function assertEmptyTarget(counts: { users: number; rows: number; files: number }) {
  if (counts.users || counts.rows || counts.files) {
    throw new Error(`O destino precisa estar vazio (usuários=${counts.users}, linhas=${counts.rows}, arquivos=${counts.files}).`);
  }
}

export function assertStorageCapacity(fileBytes: number, quotaBytes: number) {
  if (!Number.isSafeInteger(quotaBytes) || quotaBytes <= 0) {
    throw new Error("RESTORE_STORAGE_QUOTA_BYTES deve ser um inteiro positivo.");
  }
  if (fileBytes > quotaBytes) throw new Error(`Arquivos do backup excedem a cota do destino (${fileBytes}/${quotaBytes} bytes).`);
}

export function rowData(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith("$")));
}
