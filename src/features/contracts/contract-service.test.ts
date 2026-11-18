import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const admin = vi.hoisted(() => vi.fn(() => { throw new Error("não deveria consultar o banco"); }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: admin }));

import { getContractForActor } from "./contract-service";
import type { Profile } from "@/features/auth/types";

describe("getContractForActor", () => {
  it("recusa o menor antes de consultar qualquer dado (contrato, PDF e rescisão trazem valores)", async () => {
    const minor = { $id: "minor-1", role: "minor_student", capabilities: ["student"] } as Profile;
    await expect(getContractForActor(minor, "contract-1")).rejects.toThrow("minor_cannot_access_contract");
    expect(admin).not.toHaveBeenCalled();
  });
});
