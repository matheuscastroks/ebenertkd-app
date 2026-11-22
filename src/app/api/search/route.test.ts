import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  searchEntitiesForProfile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mocks.getCurrentProfile,
}));

vi.mock("@/features/search/search-service", () => ({
  searchEntitiesForProfile: mocks.searchEntitiesForProfile,
}));

import { GET } from "./route";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);

    const response = await GET(new NextRequest("https://example.com/api/search?q=joao"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.searchEntitiesForProfile).not.toHaveBeenCalled();
  });

  it("returns empty items without hitting service for queries shorter than 2 chars", async () => {
    mocks.getCurrentProfile.mockResolvedValue({ $id: "p1", role: "admin", capabilities: ["admin"] });

    const response = await GET(new NextRequest("https://example.com/api/search?q=a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
    expect(mocks.searchEntitiesForProfile).not.toHaveBeenCalled();
  });

  it("delegates authenticated search to searchEntitiesForProfile", async () => {
    const profile = { $id: "p1", role: "admin", capabilities: ["admin"] };
    const expectedItems = [
      {
        id: "student-1",
        kind: "student",
        title: "João Silva",
        subtitle: "Juvenil · Ativo",
        href: "/admin/matriculas/student-1",
        icon: "students",
      },
    ];
    mocks.getCurrentProfile.mockResolvedValue(profile);
    mocks.searchEntitiesForProfile.mockResolvedValue(expectedItems);

    const response = await GET(new NextRequest("https://example.com/api/search?q=joao"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.searchEntitiesForProfile).toHaveBeenCalledWith(profile, "joao");
    expect(await response.json()).toEqual({ items: expectedItems });
  });
});
