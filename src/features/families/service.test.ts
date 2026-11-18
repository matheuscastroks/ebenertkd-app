import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const admin = vi.hoisted(() => vi.fn(() => { throw new Error("não deveria consultar o banco"); }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: admin }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn() }));

import { enableGuardianCapability } from "./service";
import type { Profile } from "@/features/auth/types";

const profile = (role: Profile["role"]) => ({ $id: "p1", account_id: "a1", role, capabilities: role === "admin" ? ["admin"] : ["student"] }) as Profile;

describe("enableGuardianCapability", () => {
  it.each(["minor_student", "admin"] as const)("recusa o papel %s mesmo que a action receba o POST", async (role) => {
    await expect(enableGuardianCapability(profile(role))).rejects.toThrow("guardian_not_allowed_for_role");
    expect(admin).not.toHaveBeenCalled();
  });
});
