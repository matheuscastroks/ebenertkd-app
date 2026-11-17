import { describe, expect, it } from "vitest";
import { backupIdsToDelete, backupTableIds } from "../../appwrite/functions/backup/src/backup-rules.js";
import { tables } from "./schema";

const day = (offset) => new Date(Date.UTC(2026, 10, 30 - offset)).toISOString().slice(0, 10);
const complete = (offset) => ({ id: `b${offset}`, date: day(offset), complete: true });

describe("cobertura do backup", () => {
  it("exporta todas as tabelas do schema", () => {
    expect([...backupTableIds].sort()).toEqual(tables.map((table) => table.id).sort());
  });
});

describe("retenção do backup", () => {
  it("mantém 7 diários e 4 semanais e remove o restante", () => {
    const backups = Array.from({ length: 60 }, (_, index) => complete(index));
    const kept = new Set(backups.map((backup) => backup.id));
    for (const id of backupIdsToDelete(backups)) kept.delete(id);
    expect(kept.size).toBe(11);
    for (let index = 0; index < 7; index += 1) expect(kept.has(`b${index}`)).toBe(true);
  });

  it("não mantém duas cópias semanais da mesma semana", () => {
    const backups = Array.from({ length: 60 }, (_, index) => complete(index));
    const deleted = new Set(backupIdsToDelete(backups));
    const keptOlder = backups.slice(7).filter((backup) => !deleted.has(backup.id));
    expect(keptOlder).toHaveLength(4);
    expect(new Set(keptOlder.map((backup) => Math.floor(Date.parse(backup.date) / 86400000 / 7))).size).toBe(4);
  });

  it("nunca apaga a pasta incompleta de hoje nem uma incompleta sem cópia completa", () => {
    expect(backupIdsToDelete([{ id: "hoje", date: day(0), complete: false }, complete(1)])).toEqual([]);
    expect(backupIdsToDelete([{ id: "antiga", date: day(3), complete: false }])).toEqual([]);
  });

  it("remove pastas incompletas anteriores à cópia completa mais recente", () => {
    expect(backupIdsToDelete([complete(0), { id: "velha", date: day(3), complete: false }])).toEqual(["velha"]);
  });
});
