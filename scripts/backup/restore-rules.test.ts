import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertEmptyTarget,
  assertSafeRestoreTarget,
  assertStorageCapacity,
  decryptAndVerify,
  rowData,
  sha256
} from "./restore-rules";

function encrypt(value: string, key: Buffer) {
  const plaintext = Buffer.from(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.from(JSON.stringify({
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    plaintextSha256: sha256(plaintext),
    data: data.toString("base64")
  }));
}

describe("guardas de restauração", () => {
  it("autentica e valida os hashes do objeto", () => {
    const key = Buffer.alloc(32, 7);
    const envelope = encrypt("conteúdo íntegro", key);
    expect(decryptAndVerify(envelope, {
      name: "objeto.enc",
      plaintextSha256: sha256("conteúdo íntegro"),
      ciphertextSha256: sha256(envelope)
    }, key).toString()).toBe("conteúdo íntegro");
  });

  it("rejeita conteúdo cifrado adulterado", () => {
    const key = Buffer.alloc(32, 7);
    const envelope = encrypt("conteúdo", key);
    expect(() => decryptAndVerify(Buffer.concat([envelope, Buffer.from("x")]), {
      name: "objeto.enc",
      plaintextSha256: sha256("conteúdo"),
      ciphertextSha256: sha256(envelope)
    }, key)).toThrow("Hash cifrado inválido");
  });

  it("bloqueia produção e exige confirmação literal no modo apply", () => {
    expect(() => assertSafeRestoreTarget({ sourceProjectId: "origem", productionProjectId: "producao", targetProjectId: "producao", apply: true, confirmedProjectId: "producao" })).toThrow("produção");
    expect(() => assertSafeRestoreTarget({ sourceProjectId: "origem", targetProjectId: "teste", apply: true, confirmedProjectId: "outro" })).toThrow("--confirm-target");
  });

  it("exige destino vazio e cota suficiente", () => {
    expect(() => assertEmptyTarget({ users: 1, rows: 0, files: 0 })).toThrow("destino precisa estar vazio");
    expect(() => assertStorageCapacity(11, 10)).toThrow("excedem a cota");
  });

  it("remove metadados Appwrite antes de criar uma linha", () => {
    expect(rowData({ $id: "row", $permissions: [], name: "Ana" })).toEqual({ name: "Ana" });
  });
});
