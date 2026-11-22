import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  listRows: vi.fn(),
  listTrainingClasses: vi.fn(),
  listGuardianMinors: vi.fn(),
}));

vi.mock("@/lib/cache/cached-read", () => ({
  cachedRead: (_opts: unknown, load: () => Promise<unknown>) => load(),
}));

vi.mock("@/lib/appwrite/server", () => ({
  createAppwriteAdminClient: () => ({
    config: { databaseId: "db" },
    tables: { listRows: mocks.listRows },
  }),
}));

vi.mock("@/features/classes/service", () => ({
  listTrainingClasses: mocks.listTrainingClasses,
}));

vi.mock("@/features/families/service", () => ({
  listGuardianMinors: mocks.listGuardianMinors,
}));

import type { Profile } from "@/features/auth/types";
import { searchEntitiesForProfile } from "@/features/search/search-service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    $id: "profile-1",
    $sequence: "1",
    $tableId: "profiles",
    $databaseId: "db",
    $createdAt: "2026-01-01T00:00:00Z",
    $updatedAt: "2026-01-01T00:00:00Z",
    $permissions: [],
    account_id: "acc-1",
    full_name: "Usuário Teste",
    email: "teste@example.com",
    role: "admin",
    capabilities: ["admin"],
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("searchEntitiesForProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns students, classes and events (including drafts) for admin", async () => {
    mocks.listRows.mockImplementation(async ({ tableId }: { tableId: string }) => {
      if (tableId === APPWRITE_IDS.tables.students) {
        return {
          rows: [
            {
              $id: "stu-1",
              full_name: "João Infantil",
              training_class: "Infantil",
              rank_key: "gub-9",
              status: "active",
            },
          ],
        };
      }
      return {
        rows: [
          {
            $id: "evt-1",
            title: "Campeonato Infantil",
            event_type: "championship",
            status: "draft",
            starts_at: "2026-12-10T12:00:00Z",
            location_text: "Ginásio Central",
          },
        ],
      };
    });
    mocks.listTrainingClasses.mockResolvedValue([
      {
        $id: "cls-1",
        name: "Infantil Tarde",
        weekdays: ["Segunda", "Quarta"],
        start_time: "18:00",
        end_time: "19:00",
        location: "Dojang Matriz",
        status: "active",
      },
    ]);

    const results = await searchEntitiesForProfile(makeProfile({ role: "admin" }), "infantil");
    expect(results.map((r) => r.kind)).toEqual(["student", "class", "event"]);
    expect(results[0]?.href).toBe("/admin/matriculas/stu-1");
    expect(results[1]?.href).toBe("/admin/turmas/cls-1");
    expect(results[2]?.href).toBe("/admin/eventos/evt-1");
  });

  it("hides draft events and student/class tables from non-admins", async () => {
    mocks.listRows.mockResolvedValue({
      rows: [
        {
          $id: "evt-draft",
          title: "Exame Rascunho",
          event_type: "belt_exam",
          status: "draft",
          starts_at: "2026-12-10T12:00:00Z",
        },
        {
          $id: "evt-open",
          title: "Exame Oficial",
          event_type: "belt_exam",
          status: "registration_open",
          starts_at: "2026-12-15T12:00:00Z",
        },
      ],
    });

    const results = await searchEntitiesForProfile(
      makeProfile({ role: "minor_student", capabilities: ["student"] }),
      "exame"
    );

    expect(mocks.listTrainingClasses).not.toHaveBeenCalled();
    expect(mocks.listGuardianMinors).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "event-evt-open",
      kind: "event",
      href: "/aluno/exames",
    });
  });

  it("returns linked dependents and dependent-scoped event links for guardians", async () => {
    mocks.listGuardianMinors.mockResolvedValue([
      { $id: "minor-1", full_name: "Lucas Ferreira", username: "lucas.tkd" },
    ]);
    mocks.listRows.mockResolvedValue({
      rows: [
        {
          $id: "evt-1",
          title: "Copa Lucas",
          event_type: "championship",
          status: "published",
          starts_at: "2026-12-20T12:00:00Z",
        },
      ],
    });

    const results = await searchEntitiesForProfile(
      makeProfile({ role: "guardian", capabilities: ["guardian"] }),
      "lucas"
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      kind: "dependent",
      href: "/responsavel/dependentes/minor-1",
    });
    expect(results[1]).toMatchObject({
      kind: "event",
      href: "/responsavel/dependentes/minor-1/eventos",
    });
  });

  it("degrades gracefully when one Appwrite source rejects", async () => {
    mocks.listRows.mockRejectedValue(new Error("appwrite down"));
    mocks.listTrainingClasses.mockResolvedValue([
      {
        $id: "cls-1",
        name: "Adultos Noite",
        weekdays: ["Terça", "Quinta"],
        start_time: "20:00",
        end_time: "21:00",
        status: "active",
      },
    ]);

    const results = await searchEntitiesForProfile(makeProfile({ role: "admin" }), "adultos");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("class-cls-1");
  });
});
