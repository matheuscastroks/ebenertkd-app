import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({ rows: {} as Record<string, Row>, audit: [] as Array<{ event: string; metadata?: Record<string, unknown> }>, seq: 0 }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/lib/cache/cached-read", () => ({ cachedRead: (_options: unknown, load: () => unknown) => load() }));
vi.mock("@/features/auth/service", () => ({
  writeAuditEvent: vi.fn(async (event: string, _actor: string, _type: string, _id: string, metadata?: Record<string, unknown>) => {
    store.audit.push({ event, metadata });
  })
}));
vi.mock("@/lib/appwrite/server", async () => {
  const { AppwriteException } = await import("node-appwrite");
  return {
    createAppwriteAdminClient: () => ({
      config: { databaseId: "db" },
      tables: {
        listRows: async () => ({ rows: Object.values(store.rows).filter((row) => row.status === "active").map((row) => ({ ...row })) }),
        createRow: async ({ rowId, data, permissions }: { rowId: string; data: Record<string, unknown>; permissions: string[] }) => {
          expect(permissions).toEqual([]);
          store.rows[rowId] = { $id: rowId, ...data };
          return { ...store.rows[rowId] };
        },
        updateRow: async ({ rowId, data }: { rowId: string; data: Record<string, unknown> }) => {
          if (!store.rows[rowId]) throw new AppwriteException("not found", 404, "row_not_found");
          store.rows[rowId] = { ...store.rows[rowId], ...data };
          return { ...store.rows[rowId] };
        }
      }
    })
  };
});

import type { Profile } from "@/features/auth/types";
import { deleteLocation, listLocations, saveLocation } from "@/features/locations/locations-service";

const admin = { $id: "p1", account_id: "acc-admin", role: "admin" } as unknown as Profile;
const roles = ["adult_student", "guardian", "minor_student"] as const;

beforeEach(() => {
  store.rows = {};
  store.audit = [];
});

describe("autorização dos locais de treino", () => {
  it.each(roles)("%s recebe admin_required e nada é gravado", async (role) => {
    const actor = { $id: "x", account_id: "acc-x", role } as unknown as Profile;
    await expect(saveLocation(actor, { name: "Dojang" })).rejects.toThrow("admin_required");
    await expect(deleteLocation(actor, "any")).rejects.toThrow("admin_required");
    expect(store.rows).toEqual({});
    expect(store.audit).toEqual([]);
  });
});

describe("CRUD de locais", () => {
  it("sem dados de exemplo: a lista começa vazia", async () => {
    expect(await listLocations()).toEqual([]);
  });

  it("o primeiro local vira o padrão e o segundo não", async () => {
    const first = await saveLocation(admin, { name: "Dojang principal", address: "Rua A, 10" });
    const second = await saveLocation(admin, { name: "Sala infantil" });
    expect(first.is_default).toBe(true);
    expect(second.is_default).toBe(false);
    expect((await listLocations()).map((item) => item.name)).toEqual(["Dojang principal", "Sala infantil"]);
  });

  it("marcar outro como padrão tira a marca do anterior", async () => {
    const first = await saveLocation(admin, { name: "A local" });
    const second = await saveLocation(admin, { name: "B local", is_default: true });
    const list = await listLocations();
    expect(list.find((item) => item.id === second.id)?.is_default).toBe(true);
    expect(list.find((item) => item.id === first.id)?.is_default).toBe(false);
  });

  it("edita um local existente e valida o nome", async () => {
    const created = await saveLocation(admin, { name: "Tatame" });
    const updated = await saveLocation(admin, { id: created.id, name: "Tatame 2", complement: "Sala 2" });
    expect(updated).toMatchObject({ id: created.id, name: "Tatame 2", complement: "Sala 2" });
    expect(await listLocations()).toHaveLength(1);
    await expect(saveLocation(admin, { name: " " })).rejects.toThrow();
    await expect(saveLocation(admin, { id: "inexistente", name: "Outro" })).rejects.toThrow("location_not_found");
  });

  it("arquiva um local, mas nunca o padrão", async () => {
    const main = await saveLocation(admin, { name: "Principal" });
    const extra = await saveLocation(admin, { name: "Extra" });
    await expect(deleteLocation(admin, main.id)).rejects.toThrow("default_location");
    expect(await deleteLocation(admin, extra.id)).toBe(true);
    expect((await listLocations()).map((item) => item.id)).toEqual([main.id]);
    expect(await deleteLocation(admin, extra.id)).toBe(false);
  });

  it("audita sem endereço nem texto livre", async () => {
    await saveLocation(admin, { name: "Privado", address: "Rua Secreta, 99", notes: "portão azul" });
    expect(store.audit[0].event).toBe("training_location.created");
    expect(JSON.stringify(store.audit)).not.toMatch(/Secreta|azul|Privado/);
  });
});
